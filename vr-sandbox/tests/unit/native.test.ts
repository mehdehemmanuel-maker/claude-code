// Nex, the language Ego thinks in: the tests its design demands (docs/EGO-NATIVE-LANGUAGE.md section Y). Meaning must
// survive the loss of every human label; a sentence must never say more, or more surely, than the structure it
// renders; a round trip through English or Spanish must lose only what the renderer declares; a recurring structure
// must earn its morpheme by shortening the corpus; and the same questions must come out with fewer errors in Nex than
// through English words.

import { describe, expect, it } from 'vitest';
import { shapeOf, shapeKey, isDimless, type Shape } from '../../src/ganglia/native/forms';
import {
  chain, cluster, contradiction, ctx, d, distance, e, equivalent, fingerprint, hash, normalize, q, r, rename, structureDistance, t, tokens, wellFormed, why,
  evidenceRank, EVIDENCE, type R, type Structure,
} from '../../src/ganglia/native/core';
import { Morphemes, candidates, compress, descriptionLength, expandAll, promote, sameMeaning, size } from '../../src/ganglia/native/morpheme';
import { evaluate, fromLaw, fromNode, fromRelation, saidOf, tune } from '../../src/ganglia/native/nexus';
import { decompose, forAudience, parse, rankOfText, render, type Lexicon } from '../../src/ganglia/native/translate';
import { blind, read, readAll, text, texts } from '../../src/ganglia/native/text';
import { rarity } from '../../src/ganglia/native/core';
import { askable, census, flowsCarrying, polysemous, readings, saySenses, senses, settle, unitOfQuantityWord } from '../../src/ganglia/native/polysemy';
import { EVIDENCE_OF_LEVEL, MODE_OF_LEVEL, fromAttempt, fromNeed, sayAttemptInNex } from '../../src/ganglia/native/challenge';
import { corpusOf, grow as growGrammar, label, sayGrammar } from '../../src/ganglia/native/grammar';
import { hear, speak } from '../../src/ganglia/native/spoken';
import { formOf, lawForms, sameForm, sayForm } from '../../src/ganglia/native/forms';
import { between, family, regimes, verdictStructure } from '../../src/ganglia/native/space';
import { alive, anomalies, anomaly, applicable, boundSense, certificate, clusterAnomalies } from '../../src/ganglia/native/discovery';
import { epistemic, factor, labelOf, proposition, theory } from '../../src/ganglia/native/epistemic';
import { attempt, challengeById, CHALLENGES, LEVEL_ORDER, report } from '../../src/ganglia/challenges';
import { findByWords } from '../../src/ganglia/substrate/names';
import { facesOfOne } from '../../src/ganglia/substrate/faces';
import { dimensionOf } from '../../src/ganglia/units';
import { LAWS, lawById } from '../../src/ganglia/laws';
import { NODES } from '../../src/ganglia/tree/nodes';
import { build } from '../../src/ganglia/substrate';

const laws = new Map(LAWS.map((l) => [l.id, l]));
const substrate = build().substrate;

/** A bijection of names onto meaningless tokens: the hard test's instrument. */
const scramble = () => { const map = new Map<string, string>(); let n = 0; return (id: string) => { if (!map.has(id)) map.set(id, `x${(++n * 7919).toString(36)}`); return map.get(id)!; }; };

// a small world said in Nex: load raises current, current raises temperature, temperature lowers life
const load = d('load', { en: 'the load', es: 'la carga' }), current = d('current', { en: 'the current', es: 'la corriente' }), temperature = d('temperature', { en: 'the temperature', es: 'la temperatura' }), life = d('life', { en: 'the life', es: 'la vida' });
const loadCurrent = r('influence', [load, current], { dir: 1, polarity: '+', necessity: 'contributing', strength: 0.8, cert: { kind: 'interval', lo: 0.9, hi: 1, source: 'epistemic' }, ev: { how: 'measured', src: ['a current reading'] }, time: { delay: q(0.01, 's') } });
const currentTemp = r('influence', [current, temperature], { dir: 1, polarity: '+', necessity: 'contributing', strength: 0.5, cert: { kind: 'interval', lo: 0.7, hi: 0.9, source: 'epistemic' }, ev: { how: 'derived', src: ['Joule heating'] }, time: { delay: q(30, 's') } });
const tempLife = r('influence', [temperature, life], { dir: 1, polarity: '-', necessity: 'contributing', strength: 0.9, cert: { kind: 'interval', lo: 0.6, hi: 0.8, source: 'mixed' }, ev: { how: 'extrapolated', src: ['Arrhenius rate'] } });

describe('Nex: meaning survives the loss of every label (the hard test)', () => {
  it('equivalence, distance, fingerprints, chaining, contradiction and the support tree are the same under a bijection of names', () => {
    const ren = scramble();
    const world = [loadCurrent, currentTemp, tempLife];
    const scrambled = world.map((s) => rename(s, ren));
    // the structures are different terms (their names differ) but every relation among them is kept
    for (let i = 0; i < world.length; i++) for (let j = 0; j < world.length; j++) {
      expect(equivalent(world[i]!, world[j]!)).toBe(equivalent(scrambled[i]!, scrambled[j]!));
      expect(structureDistance(world[i]!, world[j]!)).toBeCloseTo(structureDistance(scrambled[i]!, scrambled[j]!), 12);
    }
    // the fingerprint of a thing has no label in it: the same before and after
    expect([...fingerprint('current', world)]).toEqual([...fingerprint(ren('current'), scrambled)]);
    // inference: chaining influences composes the coordinates the same way
    const ab = chain(loadCurrent, currentTemp)!, ab2 = chain(scrambled[0] as R, scrambled[1] as R)!;
    expect(ab.c.strength).toBeCloseTo(0.4, 12);
    expect(ab.c.polarity).toBe('+');
    // both links holding is a conjunction: its certainty lies within the Fréchet bounds, lo1 + lo2 − 1 to min(hi1, hi2), whatever their dependence
    expect(ab.c.cert).toMatchObject({ kind: 'interval', source: 'epistemic' });
    expect(ab.c.cert?.lo).toBeCloseTo(0.6, 12);
    expect(ab.c.cert?.hi).toBeCloseTo(0.9, 12);
    expect(ab.c.time?.delay?.v).toBeCloseTo(30.01, 9);
    expect(ab.c.ev?.how).toBe('measured'); // the weaker of the two kinds of evidence, never the stronger
    const noMech = (x: R): R => ({ ...x, c: { ...x.c, mech: undefined } });
    expect(hash(noMech(rename(ab, ren) as R))).toBe(hash(noMech(ab2)));
    const abc = chain(ab, tempLife)!;
    expect(abc.c.polarity).toBe('-');
    expect(abc.c.strength).toBeCloseTo(0.36, 12);
    expect(abc.c.ev?.how).toBe('extrapolated');
    expect(abc.c.cert?.lo).toBeCloseTo(0.2, 12);
    expect(abc.c.cert?.hi).toBeCloseTo(0.8, 12);
    // debugging: a contradiction is found by structure, not by words
    const denial = r('influence', [temperature, life], { dir: 1, polarity: '+' });
    expect(contradiction(tempLife, denial)?.c.mode).toBe('contradictory');
    expect(contradiction(rename(tempLife, ren) as R, rename(denial, ren) as R)?.c.mode).toBe('contradictory');
    expect(contradiction(loadCurrent, currentTemp)).toBeNull();
    // explaining structurally: the support tree names kinds of evidence and hashes, never a word of English
    const lines = why(abc);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines.join('\n')).not.toMatch(/load|current|temperature|life/);
    expect(why(abc).map((l) => l.replace(/#[0-9a-f]+/g, '#'))).toEqual(why(rename(abc, ren)).map((l) => l.replace(/#[0-9a-f]+/g, '#')));
  });

  it('a law of the book is a structure that evaluates by its mechanism, scrambled or not, and says when it is outside its domain or unbound', () => {
    const law = lawById('traction.limit')!;
    const s = fromLaw(law);
    expect(evaluate(s, laws, { mu: 0.5, N: 100 }).value).toBeCloseTo(50, 9);
    expect(evaluate(s, laws, { mu: 0.5, N: 100 }).mode).toBe('true');
    expect(evaluate(s, laws, { mu: 3, N: 100 }).mode).toBe('outside-domain');
    expect(evaluate(s, laws, { mu: 0.5 }).mode).toBe('unknown');
    // the same with every name gone: the law is reached by its mechanism token, which the bijection renames with everything else
    const ren = scramble();
    const scrambledLaws = new Map([...laws].map(([id, l]) => [ren(id), l]));
    const r2 = rename(s, ren) as R;
    expect(evaluate(r2, scrambledLaws, { mu: 0.5, N: 100 }).value).toBeCloseTo(50, 9);
    expect(evaluate(r2, laws, { mu: 0.5, N: 100 }).mode).toBe('unmodelled'); // and nothing is reached by a name that no longer exists
    expect(JSON.stringify(normalize(r2))).not.toMatch(/traction|limit/);
  });

  it('simulate, compare, discover: things from different domains that do the same thing have the same shape under the energy tuner', () => {
    const ids = ['spring.helical', 'capacitor', 'flywheel.disc', 'cell.li-ion', 'tool.blade', 'bearing'];
    const said = new Map(ids.map((id) => [id, saidOf(substrate, id, laws)]));
    // under the energy tuner a spring, a capacitor, a flywheel and a cell look alike: each binds an energy to itself by a law
    const energy = (id: string) => fingerprint(id, tune(said.get(id)!, 'energy'));
    for (const id of ['spring.helical', 'capacitor', 'flywheel.disc', 'cell.li-ion']) expect(tune(said.get(id)!, 'energy').length, id).toBeGreaterThan(0);
    // measured 2026-10-03: a spring and a capacitor are 0.90 apart on everything said of them and 0.59 under the energy tuner
    const raw = distance(fingerprint('spring.helical', said.get('spring.helical')!), fingerprint('capacitor', said.get('capacitor')!));
    const dSC = distance(energy('spring.helical'), energy('capacitor')), dSF = distance(energy('spring.helical'), energy('flywheel.disc'));
    expect(dSC).toBeLessThan(raw);
    expect(dSC).toBeLessThan(0.7);
    expect(dSF).toBeLessThan(0.7);
    // a blade stores nothing: under the energy tuner there is nothing of it to compare
    expect(tune(said.get('tool.blade')!, 'energy').length).toBe(0);
    const groups = cluster(new Map(['spring.helical', 'capacitor', 'flywheel.disc', 'cell.li-ion'].map((id) => [id, energy(id)])), 0.7);
    expect(groups.length).toBe(1);
    // and the scrambled substrate clusters the same
    const ren = scramble();
    const scrambled = new Map(['spring.helical', 'capacitor', 'flywheel.disc', 'cell.li-ion'].map((id) => [ren(id), fingerprint(ren(id), tune(said.get(id)!, 'energy').map((x) => rename(x, ren)))]));
    expect(cluster(scrambled, 0.7)).toEqual(groups.map((g) => g.map(ren)));
  });

  it('a phenomenon with no name is said at once from primitives; its rendering coins a term and says so', () => {
    const a = d('p:7f3a'), b = d('p:9c21');
    const s = r('influence', [a, b], { dir: 1, polarity: '-', necessity: 'necessary', strength: 0.3, cert: { kind: 'interval', lo: 0.4, hi: 0.6, source: 'epistemic' }, ev: { how: 'hypothesized' }, time: { delay: q(2, 's') } });
    expect(wellFormed(s).ok).toBe(true);
    const out = render(s, 'en', 'engineer');
    expect(out.coined.length).toBe(2);
    expect(out.text).toMatch(/the thing #p7f3a/);
    expect(out.text).toMatch(/may be/); // a hypothesis is never rendered as a fact
    expect(out.rank).toBe('hypothesized');
  });
});

describe('Nex: the modes, the frame, the dimensions', () => {
  it('ten ways of not being so are different modes; a comparison across dimensions and a motion without a frame mean nothing', () => {
    const heat = q(100, 'J'), temp = q(300, 'K');
    expect(wellFormed(r('compare', [heat, temp], {}))).toEqual({ ok: false, mode: 'undefined', why: 'the two quantities have different dimensions' });
    expect(wellFormed(r('compare', [heat, q(50, 'J')], {})).ok).toBe(true);
    const ball = d('ball');
    expect(wellFormed(r('quantity', [ball, d('velocity'), q(3, 'm/s')], {})).ok).toBe(false);
    expect(wellFormed(r('quantity', [ball, d('velocity'), q(3, 'm/s')], { frame: { observer: 'ground' } })).ok).toBe(true);
    const modes = ['false', 'unknown', 'unobserved', 'unmodelled', 'impossible-under', 'outside-domain', 'undefined', 'contradictory', 'insufficient', 'unmeasured'] as const;
    const texts = modes.map((mode) => render(r('kind', [d('a', { en: 'a' }), d('b', { en: 'b' })], { mode }), 'en').text);
    expect(new Set(texts).size).toBe(modes.length);
    expect(texts[0]).toMatch(/^It is false that/);
    expect(texts[9]).toMatch(/^It has not been measured whether/);
  });

  it('nested models are native: a belief about a belief, a hypothetical branch, an intervention', () => {
    const x = r('kind', [d('a', { en: 'a' }), d('b', { en: 'b' })], { ev: { how: 'measured' } });
    const nested = ctx('believe', 'ego', ctx('believe', 'user', x), { cert: { kind: 'interval', lo: 0.3, hi: 0.6 } });
    expect(render(nested, 'en').text).toMatch(/^Ego believes that user believes that a is, by measurement, a kind of b/);
    expect(equivalent(nested, ctx('believe', 'ego', ctx('believe', 'user', x), { cert: { kind: 'interval', lo: 0.3, hi: 0.6 } }))).toBe(true);
    expect(equivalent(nested, ctx('believe', 'user', ctx('believe', 'ego', x)))).toBe(false);
    const branch = ctx('intervene', 'load', r('influence', [current, temperature], { dir: 1, polarity: '+' }));
    expect(render(branch, 'en').text).toMatch(/^If load were set then the current raises the temperature/);
    expect(hash(branch)).not.toBe(hash(ctx('world', 'actual', r('influence', [current, temperature], { dir: 1, polarity: '+' }))));
  });
});

describe('Nex: the translation layer and its loss', () => {
  it('renders in English and Spanish for each audience, counting what it dropped; a mechanism is never spoken, a child hears no numbers', () => {
    const en = render(loadCurrent, 'en', 'engineer'), es = render(loadCurrent, 'es', 'engineer'), child = render(loadCurrent, 'en', 'child');
    expect(en.text).toBe('Certainly (0.9 to 1) strongly the load is, by measurement, contributes to (raises) the current (a current reading) after 0.01 s.');
    expect(es.text).toBe('Con certeza (0.9 to 1) fuertemente la carga es, por medición, contribuye a (aumenta) la corriente (a current reading) tras 0.01 s.');
    expect(en.loss).toBeLessThan(0.15);
    expect(child.loss).toBeGreaterThan(en.loss);
    expect(child.text).not.toMatch(/0\.9|0\.01/);
    const withMech = r('influence', [load, current], { dir: 1, polarity: '+', mech: 'abc123' });
    expect(render(withMech, 'en').dropped).toEqual(['$.mech']);
    expect(forAudience(withMech, 'child')).toBe('The load raises the current.');
  });

  it('translation is epistemically monotonic: no rendering reads as surer than its structure, for every kind of evidence', () => {
    for (const how of EVIDENCE) {
      const s = r('kind', [d('a', { en: 'a' }), d('b', { en: 'b' })], { ev: { how } });
      const out = render(s, 'en');
      const read = rankOfText(out.text, 'en');
      expect(read, how).not.toBeNull();
      expect(evidenceRank(read!), `${how} rendered as ${out.text}`).toBeGreaterThanOrEqual(evidenceRank(how));
      expect(out.rank).toBe(how);
    }
  });

  it('round trip: native to English to native and native to Spanish to native lose exactly what the renderer declares, and both come back to one structure', () => {
    const lexicon: Lexicon = {};
    for (const x of [load, current, temperature, life]) for (const lang of ['en', 'es'] as const) lexicon[x.aliases![lang]!] = x;
    for (const s of [loadCurrent, currentTemp, tempLife]) {
      const en = render(s, 'en', 'engineer'), es = render(s, 'es', 'engineer');
      const backEn = parse(en.text, 'en', lexicon), backEs = parse(es.text, 'es', lexicon);
      expect(backEn, en.text).not.toBeNull();
      expect(backEs, es.text).not.toBeNull();
      // the two surface languages agree on the structure they carried
      expect(hash(backEn!)).toBe(hash(backEs!));
      // what came back differs from what went in only by what the rendering declared dropped (here: the exact strength number)
      const lost = structureDistance(s, backEn!);
      expect(lost).toBeLessThan(0.15);
      expect(en.dropped.every((p) => p.startsWith('$.strength') || p.startsWith('$.time.') || p === '$.mech')).toBe(true);
    }
  });

  it('human to native: "that motor is struggling" is candidates with uncertainty, none chosen, each with what would settle it', () => {
    const motor = d('motor.dc', { en: 'the motor' });
    const cands = decompose('that motor is struggling', motor);
    expect(cands.length).toBe(5);
    for (const c of cands) {
      expect(c.cert.hi).toBeLessThan(1);
      expect(c.structure.k === 'R' && c.structure.c.mode).toBe('unmeasured');
      expect(c.settledBy.length).toBeGreaterThan(5);
    }
    expect(cands.map((c) => c.says)).toContain('its current is near its limit');
    expect(decompose('that motor is fine', motor)).toEqual([]);
  });
});

describe('Nex: morphemes earn their place', () => {
  const corpus = (() => {
    const out: { s: Structure; domain: string }[] = [];
    // one recurring structure across three domains: a negative feedback loop (X raises Y, Y lowers X) around a goal
    const loop = (x: string, y: string, domain: string) => ({ s: r('state', [r('influence', [d(x), d(y)], { dir: 1, polarity: '+' }), r('influence', [d(y), d(x)], { dir: 1, polarity: '-' })], {}), domain });
    out.push(loop('error', 'command', 'control'), loop('error', 'command', 'control'), loop('prey', 'predator', 'ecology'), loop('price', 'demand', 'economy'), loop('temperature', 'sweat', 'biology'));
    // and noise that recurs in one domain only, which must not become a morpheme
    for (let i = 0; i < 4; i++) out.push({ s: r('part', [d('engine'), r('part', [d('block'), d(`bolt${i}`)], {})], {}), domain: 'machines' });
    return out;
  })();

  it('a structure recurring across domains is promoted when it shortens the corpus; one domain\'s repetition is refused as jargon; compression is exact', () => {
    const reg = new Morphemes();
    const cands = candidates(corpus, { min: 3, minOcc: 3, minDomains: 2 });
    expect(cands.length).toBeGreaterThan(0);
    expect(cands.every((c) => c.domains.length >= 2 && c.saved > 0)).toBe(true);
    const before = descriptionLength(corpus.map((x) => x.s));
    const made = promote(reg, cands, 3);
    expect(made.length).toBeGreaterThan(0);
    const after = descriptionLength(corpus.map((x) => x.s), reg);
    expect(after).toBeLessThan(before);
    for (const { s } of corpus) {
      const c = compress(s, reg);
      expect(sameMeaning(c, s, reg)).toBe(true);
      expect(hash(expandAll(c, reg))).toBe(hash(s));
    }
    // the loop's shape became a morpheme; the engine's bolts did not
    expect(reg.list().some((mm) => tokens(mm.def).some((tk) => tk.startsWith('R.influence')))).toBe(true);
    expect(reg.list().some((mm) => JSON.stringify(mm.def).includes('bolt'))).toBe(false);
    expect(size(compress(corpus[0]!.s, reg))).toBeLessThan(size(corpus[0]!.s));
  });

  it('a morpheme whose meaning changes is a new version; what was written with the old one still means what it meant', () => {
    const reg = new Morphemes();
    const v1 = reg.define(r('influence', [d('a'), d('b')], { dir: 1, polarity: '+' }), { occurrences: 3, domains: ['x', 'y'], saved: 2 }, 'drives');
    const old = { k: 'M' as const, id: v1.id, version: 1 };
    const v2 = reg.revise(v1.id, r('influence', [d('a'), d('b')], { dir: 1, polarity: '+', necessity: 'sufficient' }), { occurrences: 5, domains: ['x', 'y'], saved: 4 });
    expect(v2.version).toBe(2);
    expect(v2.supersedes).toEqual({ id: v1.id, version: 1 });
    expect(hash(old, reg.expand)).toBe(hash(v1.def));
    expect(hash({ k: 'M', id: v1.id, version: 2 }, reg.expand)).toBe(hash(v2.def));
    expect(hash(old, reg.expand)).not.toBe(hash({ k: 'M', id: v1.id, version: 2 }, reg.expand));
    expect(reg.latest(v1.id)?.label).toBe('drives');
  });
});

describe('Nex: one system with the Nexus', () => {
  it('a node of the law tree and an arrow of the substrate each have a native form built from what they already carry', () => {
    const node = NODES.find((n) => n.id === 'F-6.3')!;
    const forms = fromNode(node);
    expect(forms.some((s) => s.k === 'R' && s.op === 'kind' && s.args[1]?.k === 'D' && s.args[1].id === 'F-6')).toBe(true);
    expect(forms.filter((s) => s.k === 'E').length).toBe(node.heldBy!.length);
    expect(forms.some((s) => s.k === 'R' && s.op === 'morphism')).toBe(true);
    const rel = substrate.outOf('bearing', 'fails-by')[0]!;
    const s = fromRelation(rel, substrate)!;
    expect(s.op).toBe('influence');
    expect(s.c.polarity).toBe('-');
    expect(s.c.cert?.lo).toBeLessThanOrEqual(rel.confidence);
    expect(s.c.cert?.hi).toBeGreaterThanOrEqual(rel.confidence);
    expect(render(s, 'en').text).toMatch(/bearing/i);
    // the violated-then-tested law reads as simulated evidence, an axiom as assumed
    expect(fromNode(NODES.find((n) => n.id === 'A-1')!)[0]!.k === 'R' && (fromNode(NODES.find((n) => n.id === 'A-1')!)[0] as R).c.ev?.how).toBe('assumed');
  });

  it('tuners: the same transformer through energy, heat, failure, making and structure are different selections of one structure', () => {
    // a transformer has all five faces said of it; the brushed DC motor has no thermal law or failure said of it yet, so its thermal view is honestly empty
    const said = saidOf(substrate, 'transformer', laws);
    expect(tune(saidOf(substrate, 'motor.dc', laws), 'thermal')).toEqual([]);
    const views = { energy: tune(said, 'energy'), thermal: tune(said, 'thermal'), failure: tune(said, 'failure'), manufacturing: tune(said, 'manufacturing'), structure: tune(said, 'structure') };
    for (const [name, v] of Object.entries(views)) expect(v.length, name).toBeGreaterThan(0);
    expect(new Set(Object.values(views).map((v) => v.map((x) => hash(x)).sort().join())).size).toBe(5);
    expect(views.failure.every((x) => x.k === 'R' && x.c.polarity === '-')).toBe(true);
  });
});

describe('Nex against English on the confusions English invites', () => {
  // the same five questions, asked through English words (a word-overlap judge of two statements) and through Nex
  const pairs: [string, string, Structure, Structure][] = [
    ['heat flows into the block', 'temperature flows into the block', r('quantity', [d('block'), d('heat'), q(100, 'J')], {}), r('quantity', [d('block'), d('temperature'), q(300, 'K')], {})],
    ['the weight of the crate is 10', 'the mass of the crate is 10', r('quantity', [d('crate'), d('weight'), q(10, 'N')], {}), r('quantity', [d('crate'), d('mass'), q(10, 'kg')], {})],
    ['the speed of the ball is 3', 'the velocity of the ball is 3', r('quantity', [d('ball'), d('speed'), q(3, 'm/s')], { frame: { observer: 'ground' } }), r('quantity', [d('ball'), d('velocity'), q(3, 'm/s')], {})],
    ['the energy of the motor is 50', 'the power of the motor is 50', r('quantity', [d('motor'), d('energy'), q(50, 'J')], {}), r('quantity', [d('motor'), d('power'), q(50, 'W')], {})],
    ['ice cream raises drowning', 'ice cream and drowning rise together', r('influence', [d('icecream'), d('drowning')], { dir: 1, polarity: '+' }), r('support', [d('icecream'), d('drowning')], { dir: 0 })],
  ];
  const overlap = (a: string, b: string) => { const A = new Set(a.split(' ')), B = new Set(b.split(' ')); let n = 0; for (const w of A) if (B.has(w)) n++; return n / new Set([...A, ...B]).size; };

  it('English words judge four of the five pairs the same thing; Nex judges none the same, and says why', () => {
    let englishErrors = 0, nexErrors = 0;
    for (const [sa, sb, na, nb] of pairs) {
      if (overlap(sa, sb) >= 0.6) englishErrors++; // "nearly the same sentence": the words say so
      if (equivalent(na, nb)) nexErrors++; // the same meaning, exactly: what English's near-identical sentences claim
      expect(structureDistance(na, nb)).toBeGreaterThan(0);
    }
    expect(englishErrors).toBeGreaterThanOrEqual(4);
    expect(nexErrors).toBe(0);
    // and the two that are not even well formed are caught as such: a motion without a frame; a comparison of heat with temperature
    expect(wellFormed(pairs[2]![3]).ok).toBe(false);
    expect(wellFormed(r('compare', [q(100, 'J'), q(300, 'K')], {})).ok).toBe(false);
    // a correlation cannot be chained as a cause: support is computed, never a mechanism
    expect(chain(pairs[4]![3] as R, r('influence', [d('drowning'), d('news')], { dir: 1, polarity: '+' }))).toBeNull();
    expect(chain(pairs[4]![2] as R, r('influence', [d('drowning'), d('news')], { dir: 1, polarity: '+' }))).not.toBeNull();
  });

  it('a thought that takes English paragraphs is one structure, rendered back as several qualified sentences with its loss known', () => {
    // under the assumption of still air, in a branch where the load is doubled, Ego believes, by extrapolation and only at the scale of a metre, that the temperature will probably exceed its limit after about ten minutes
    const thought = ctx('assume', 'still-air', ctx('branch', 'load-doubled', ctx('believe', 'ego', r('compare', [r('quantity', [d('winding', { en: 'the winding' }), d('temperature', { en: 'temperature' }), q(400, 'K', { kind: 'interval', lo: 380, hi: 420, source: 'mixed' })], {}), r('quantity', [d('winding', { en: 'the winding' }), d('limit', { en: 'limit' }), q(378, 'K')], {})], { cert: { kind: 'interval', lo: 0.6, hi: 0.8, source: 'epistemic' }, ev: { how: 'extrapolated', src: ['Arrhenius rate'] }, time: { delay: q(600, 's'), window: [400, 900] }, scale: { L: q(1, 'm') } }))));
    expect(size(thought)).toBeGreaterThan(12);
    const en = render(thought, 'en', 'engineer');
    expect(en.text).toMatch(/^Assuming still-air, in a branch of load-doubled, ego believes that probably \(0.6 to 0.8\)/);
    expect(en.text).toMatch(/is, by extrapolation, greater than/);
    expect(en.text).toMatch(/after 600 s at a scale of 1 m/);
    expect(en.dropped).toEqual(['$.body.body.body.time.window']); // the only thing English had no words for here
    expect(en.rank).toBe('extrapolated');
    expect(e(thought, 'hypothesized', 'ego').how).toBe('hypothesized');
    expect(t(d('cold'), d('warm'), { ev: { how: 'simulated' } }).c.ev?.how).toBe('simulated');
  });
});

describe('Nex: the compact text (section E) is a surface on the canonical form, not a second language', () => {
  const corpus = (): Structure[] => {
    const out: Structure[] = [loadCurrent, currentTemp, tempLife, chain(loadCurrent, currentTemp)!, chain(chain(loadCurrent, currentTemp)!, tempLife)!, contradiction(tempLife, r('influence', [temperature, life], { dir: 1, polarity: '+' }))!,
      ctx('assume', 'still-air', ctx('believe', 'ego', r('compare', [q(400, 'K', { kind: 'interval', lo: 380, hi: 420, source: 'mixed' }), q(378, 'K')], { time: { delay: q(600, 's'), window: [400, 900] }, scale: { L: q(1, 'm') } }))),
      t(d('cold'), d('hot'), { ev: { how: 'simulated' }, time: { dur: q(30, 's') } }, [d('powered')]), e(loadCurrent, 'measured', 'a reading', { by: 'ego', at: q(3, 's') }),
      r('quantity', [d('ball'), d('velocity'), q(3, 'm/s')], { frame: { observer: 'ground', rest: 'table' } }),
      r('quantity', [d('rod'), d('length'), q(3.2, 'mm')], {}), r('quantity', [d('rod'), d('temperature'), q(20, 'degC')], {}), r('quantity', [d('x'), d('efficiency'), q(85, '%')], {}), r('quantity', [d('x'), d('torque'), q(2.5, 'N m')], {}), r('quantity', [d('x'), d('n'), q(0.5, '')], {}),
      r('kind', [d('limit:F-6.2:the servo holds, (x)'), d('b')], { mode: 'outside-domain', under: ['a b', 'c'], against: ['h1'], margin: 0.2, instrument: 'thermocouple' }),
      r('influence', [d('3d'), d('1e3x')], { strength: q(5, 'N'), dom: [r('compare', [q(1, 'm'), q(2, 'm')], {}), d('still air')] })];
    for (const l of LAWS) out.push(fromLaw(l));
    for (const n of NODES) out.push(...fromNode(n));
    for (const id of ['bearing', 'motor.dc', 'transformer', 'spring.helical', 'capacitor', 'bio.human', 'steel', 'qty.heat', 'cell.li-ion', 'wing']) out.push(...saidOf(substrate, id, laws));
    return out;
  };

  it('every structure reads back from its text to the same hash, and the text of what was read is the same text (measured over every law, every tree node and ten things of the substrate)', () => {
    const all = corpus();
    expect(all.length).toBeGreaterThan(600);
    for (const s of all) {
      const tx = text(s);
      expect(tx).not.toMatch(/\n/);
      const back = read(tx);
      expect(hash(back), tx).toBe(hash(s));
      expect(text(back)).toBe(tx);
    }
    expect(readAll(texts(all.slice(0, 5))).map((s) => hash(s))).toEqual(all.slice(0, 5).map((s) => hash(s)));
  });

  it('the text is the structure and nothing else: no English alias in it, a quantity in the unit it was given, an absent coordinate absent', () => {
    expect(text(loadCurrent)).toBe('influence(load, current){dir:1 polarity:+ necessity:contributing strength:0.8 cert:{kind:interval lo:0.9 hi:1 source:epistemic} time:{delay:0.01[s]} ev:{how:measured src:["a current reading"]}}');
    expect(text(loadCurrent)).not.toMatch(/the load|the current/);
    expect(text(r('quantity', [d('rod'), d('length'), q(3.2, 'mm')], {}))).toBe('quantity(rod, length, 3.2[mm])');
    expect(text(r('quantity', [d('x'), d('torque'), q(2.5, 'N m')], {}))).toBe('quantity(x, torque, 2.5[N m])');
    expect(text(r('kind', [d('a'), d('b')], {}))).toBe('kind(a, b)');
    // a quantity made by composition carries no unit spelling: its dimension's SI symbol is written, and a dimension with no symbol is written as itself
    expect(text(chain(loadCurrent, currentTemp)!)).toMatch(/time:\{delay:30.01\[s\]\}/);
    expect(text({ k: 'Q', v: 2, dim: [1, 1, -1, 0, 0] })).toBe('2{dim:[1 1 -1 0 0]}');
    // an id with a space or a bracket is quoted; one that would read as a number is quoted; the rest stand bare
    expect(text(d('limit:F-6.2:the servo holds, (x)'))).toBe('"limit:F-6.2:the servo holds, (x)"');
    expect(text(d('1e3'))).toBe('"1e3"');
    expect(text(d('valid:friction.coulomb'))).toBe('valid:friction.coulomb');
    // the modes, the nested models and a condition on a transformation all have a place
    expect(text(ctx('believe', 'ego', ctx('believe', 'user', r('kind', [d('a'), d('b')], { mode: 'unmeasured', instrument: 'thermocouple' }))))).toBe('C.believe(ego, C.believe(user, kind(a, b){mode:unmeasured instrument:thermocouple}))');
    expect(text(t(d('cold'), d('hot'), { ev: { how: 'simulated' } }, [d('powered')]))).toBe('T(cold, hot | powered){ev:{how:simulated}}');
  });

  it('malformed text is refused with where it went wrong, never read as something else', () => {
    expect(() => read('influence(a, b')).toThrow(/Nex text/);
    expect(() => read('cause(a, b)')).toThrow(/no operator cause/);
    expect(() => read('C.hope(ego, kind(a, b))')).toThrow(/no context kind hope/);
    expect(() => read('kind(a, b) kind(c, d)')).toThrow(/continues/);
    expect(() => read('kind(a, b){mode:"true"')).toThrow(/unterminated/);
  });

  it('the blind text is the shape alone: the same for a structure and for its renaming (the hard test by eye)', () => {
    const ren = scramble();
    for (const s of [loadCurrent, chain(loadCurrent, currentTemp)!, e(loadCurrent, 'measured', 'a reading')]) {
      expect(blind(s)).toBe(blind(rename(s, ren)));
      expect(blind(s)).not.toMatch(/load|current/);
    }
    expect(blind(loadCurrent)).toBe('influence($1, $2){dir:1 polarity:+ necessity:contributing strength:0.8 cert:{kind:interval lo:0.9 hi:1 source:epistemic} time:{delay:0.01[s]} ev:{how:measured}}');
    // and a blind text still reads: the shape is a structure in its own right (its sources gone with its names), and blinding it again changes nothing
    expect(blind(read(blind(loadCurrent)))).toBe(blind(loadCurrent));
    expect(hash(read(blind(loadCurrent)))).toBe(hash(rename({ ...loadCurrent, c: { ...loadCurrent.c, ev: { how: 'measured' } } }, (id) => (id === 'load' ? '$1' : '$2'))));
  });
});

describe('Nex: polysemy (section S) is split by structure, measured over the substrate (section Y.13)', () => {
  it('a word reaches readings, each a structure with its kind and dimension; the faces of one thing are one sense; what the word alone cannot settle is asked', () => {
    const rs = readings(substrate, 'current');
    // the electric current (a quantity, amperes), the ocean current (a phenomenon), the current sensor: three senses at the same reach
    expect(rs.map((x) => x.id)).toEqual(expect.arrayContaining(['qty.current', 'earth.current', 'sensor.current']));
    expect(polysemous(rs)).toBe(true);
    expect(askable(senses(rs)).length).toBe(3);
    expect(saySenses(askable(senses(rs)))).toMatch(/electric current \(a quantity, in A\); current, of earth \(a phenomenon\)/);
    // a quantity reading is a quantity structure (its dimension in the structure, not in a word); a thing is a kind structure
    const qty = rs.find((x) => x.id === 'qty.current')!;
    expect(qty.structure.k === 'R' && qty.structure.op).toBe('quantity');
    expect(qty.dim).toEqual([0, 0, 0, 1, 0]);
    // settled by the dimension the question carries, or by the kind of thing it is about; chosen only when one sense survives
    expect(settle(rs, { dim: dimensionOf('A') }).chosen?.id).toBe('qty.current');
    expect(settle(rs, { kinds: ['quantity'] }).chosen?.id).toBe('qty.current');
    expect(settle(rs, { flow: true }).chosen?.id).toBe('flow.electric');
    expect(settle(rs, {}).chosen).toBeUndefined();
    expect(settle(rs, {}).open.length).toBeGreaterThan(1);
    // heat the flow and heat the quantity are one sense: a flow and a quantity it carries are faces of one thing
    expect(facesOfOne('signal', 'quantity')).toBe(true);
    expect(facesOfOne('law', 'quantity')).toBe(true);
    expect(facesOfOne('phenomenon', 'quantity')).toBe(false);
    expect(senses(readings(substrate, 'heat').filter((x) => ['flow.heat', 'heat'].includes(x.id))).length).toBe(1);
    // a catalogue's search token is not a reading to choose by context: "drive" on every motor and chain settles to nothing
    expect(settle(readings(substrate, 'drive'), { kinds: ['component'] }).chosen).toBeUndefined();
  });

  it('the census: every word that reaches things of more than one sense; the word lookup chooses none of them in silence but four, named here as open', () => {
    const c = census(substrate);
    // measured 3 October 2026: 4002 words (names, aliases, id tails and the flow table), 42 reach more than one sense; before this change the lookup resolved every one of them to a single thing without a word about the others
    expect(c.words).toBeGreaterThan(3000);
    expect(c.polysemous.length).toBeGreaterThanOrEqual(30);
    expect(c.polysemous).toEqual(expect.arrayContaining(['current', 'glue', 'fuel', 'filter', 'wood', 'bone', 'solder', 'flux']));
    const silent = c.polysemous.filter((w) => findByWords(substrate, w));
    // the three still chosen: a tool against its machine (broach), the geometry kind against a part (disc), a law against a motor named by it (induction);
    // two more were chosen until 4 October 2026 by the id-tail rule across a function and a law (axial) and across the wave-speed law and an electromagnet
    // (electromagnetic): the last resort now sees the senses the census sees, and asks
    expect(silent).toEqual(['broach', 'disc', 'induction']);
    for (const w of c.polysemous) if (!silent.includes(w)) expect(findByWords(substrate, w), w).toBeUndefined();
  });

  it('the lookup and the census read one word: an alias written with a dash is the alias ("coarse graining" is the observation operator, one sense), and a tail two things of different kinds share ("flow": a function and a construction law) is asked, not chosen', () => {
    expect(polysemous(readings(substrate, 'coarse graining'))).toBe(false);
    expect(findByWords(substrate, 'coarse graining')?.id).toBe('tsc.coarse-graining');
    for (const w of ['flow', 'vibration']) {
      const rs = readings(substrate, w);
      expect(rs.map((x) => x.reach), w).toEqual(['tail', 'tail']);
      expect(polysemous(rs), w).toBe(true);
      expect(findByWords(substrate, w), w).toBeUndefined();
    }
  });

  it('the flow table commits a quantity word to one flow where the quantity rides on several: said as a convention, never silent', () => {
    const c = census(substrate);
    expect(c.flowWordsThatAreQuantities.map((x) => x.word)).toEqual(expect.arrayContaining(['power', 'force', 'weight']));
    // power (W) is carried by every flow that carries energy in time; voltage (V) by the electric flow alone
    expect(flowsCarrying(dimensionOf('W'))).toEqual(expect.arrayContaining(['electric', 'rotation', 'translation', 'heat', 'light']));
    expect(flowsCarrying(dimensionOf('V'))).toEqual(['electric']);
    expect(unitOfQuantityWord('power')).toBe('W');
    expect(unitOfQuantityWord('electric current')).toBe('A');
    expect(unitOfQuantityWord('music')).toBeUndefined();
  });
});

describe('Nex: the challenge engine\'s problems both ways (section Y.14)', () => {
  it('every level is a mode of a structure that says what it is of: a word with no flow, a transformation with no mechanism, one outside what is here, one held false, insufficient, or true; every one that grew is known by simulation, never by measurement', () => {
    for (const level of LEVEL_ORDER) { expect(MODE_OF_LEVEL[level]).toBeDefined(); expect(EVIDENCE_OF_LEVEL[level] === null || EVIDENCE[EVIDENCE.indexOf(EVIDENCE_OF_LEVEL[level]!)]).toBeTruthy(); }
    expect(new Set(Object.values(MODE_OF_LEVEL)).size).toBe(5); // unsayable and no way are both unmodelled, of different things
    for (const c of CHALLENGES) {
      const a = attempt(c);
      const x = fromAttempt(a);
      expect(x.needs.length).toBe(a.results.length);
      for (const [k, s] of x.needs.entries()) {
        const res = a.results[k]!;
        const mode = s.k === 'T' || s.k === 'R' ? s.c.mode : undefined;
        expect(mode, res.need.does).toBe(MODE_OF_LEVEL[res.level]);
        // what grew is simulated; nothing in an attempt is ever measured
        const how = s.k === 'T' || s.k === 'R' ? s.c.ev?.how : undefined;
        expect(how === 'measured' || how === 'calibrated').toBe(false);
        if (['works', 'partial', 'fails'].includes(res.level)) expect(how).toBe('simulated');
        // the two kinds of unmodelled differ in shape, not in a word: the word's is a kind relation, the physics' a transformation
        if (res.level === 'unsayable') expect(s.k === 'R' && s.op === 'kind').toBe(true);
        if (res.level === 'no way') expect(s.k).toBe('T');
        // what a need is comes from the challenge, not its words: a store is an invariant under time, a sense a morphism, the rest transformations
        if ('as' in res.need && res.need.as === 'store') expect(s.k === 'R' && s.op === 'invariant').toBe(true);
        if ('as' in res.need && res.need.as === 'sense') expect(s.k === 'R' && s.op === 'morphism').toBe(true);
        if (res.flows && !('as' in res.need && (res.need.as === 'store' || res.need.as === 'sense')) && res.level !== 'unsayable') expect(s.k).toBe('T');
        // the text of each need reads back to the same hash (the compact text covers the challenge engine's structures too)
        expect(hash(read(text(s)))).toBe(hash(s));
      }
      // every bound of a law is a quantity with the law's own evidence, and the law as a constraint beside it
      for (const n of a.notes.filter((n) => n.law && n.value !== undefined)) {
        const qty = x.bounds.find((b) => b.k === 'R' && b.op === 'quantity' && b.c.mech === n.law);
        expect(qty, `${c.id} ${n.law}`).toBeDefined();
        expect(qty!.k === 'R' && qty!.args[2]?.k === 'Q' && qty!.args[2].v).toBeCloseTo(n.value!, 9);
        expect(qty!.k === 'R' && qty!.c.ev?.how).not.toBe('measured');
      }
      // the whole is in the mode of the worst need
      expect(x.whole.c.mode).toBe(MODE_OF_LEVEL[a.worst]);
    }
  });

  it('the English report says the Nex of it: the modes, how each is known, what the English carried; and renders a hedged transformation grammatically', () => {
    const a = attempt(challengeById('scientist')!);
    const said = sayAttemptInNex(a);
    expect(said).toMatch(/^In Nex the 4 needs are transformations between flows in the modes outside-domain ×2, insufficient ×1, true ×1; "works", "partial" and "fails" are known by simulation \(grown and checked in my own machinery, not measured in a world\)/);
    expect(said).toMatch(/the whole is #[0-9a-f]{8}, and this English carried \d+ of \d+ pieces of it\.$/);
    expect(report(a)).toMatch(/ In Nex the 4 needs are transformations/);
    const works = fromNeed(a.results.find((r) => r.level === 'works')!);
    expect(render(works, 'en', 'engineer').text).toBe('Signal becomes, in simulation, translation (grown and checked in my own machinery).');
    const unbuildable = fromNeed(a.results.find((r) => r.level === 'unbuildable')!);
    expect(render(unbuildable, 'en', 'engineer').text).toMatch(/^It is outside the domain to say whether load maps to signal/);
    // "hold one bit" and "let one bit switch another" were one structure (signal to signal) until the challenge said what each is
    const computer = attempt(challengeById('computer')!);
    const hold = fromNeed(computer.results.find((r) => r.need.does === 'hold one bit')!), gate = fromNeed(computer.results.find((r) => /logic gate/.test(r.need.does))!);
    expect(hash(hold)).not.toBe(hash(gate));
    expect(hold.k === 'R' && hold.op).toBe('invariant');
    expect(gate.k).toBe('T');
    // the loss: the mechanism (the way ids), the domain and what it is outside of are never spoken; measured 3 October: the scientist's English carries 30 of 36 pieces
    const x = fromAttempt(a);
    expect(x.carried).toBeLessThan(x.present);
    expect(x.present - x.carried).toBeGreaterThanOrEqual(4);
    // a word her flow language lacks is a distinction with no flow behind it, said as such
    const tissue = fromNeed(attempt(challengeById('symbiote')!).results.find((r) => r.level === 'unsayable')!);
    expect(render(tissue, 'en', 'engineer').text).toBe('I have no model of whether "tissue" is a kind of a flow.');
  });
});

describe('Nex: the grammar grows over everything the substrate says (sections O and P at scale)', () => {
  it('morphemes earned by description length shorten the corpus, expand back exactly, recur across domains, and the first is a textbook fact', () => {
    const g = growGrammar(substrate, laws);
    // measured 3 October 2026: 13785 structures, 497 recurring shapes, 8 promoted, 17 % shorter
    expect(g.corpus.length).toBeGreaterThan(5000);
    expect(g.candidates.length).toBeGreaterThan(50);
    expect(g.promoted.length).toBe(8);
    expect(g.ratio).toBeLessThan(0.9);
    expect(g.after).toBe(descriptionLength(g.corpus.map((x) => x.s), g.registry));
    expect(g.shortened).toBeGreaterThan(g.corpus.length / 4);
    for (const m of g.promoted) {
      expect(m.evidence.domains.length).toBeGreaterThanOrEqual(2);
      expect(m.evidence.occurrences).toBeGreaterThanOrEqual(3);
      expect(m.evidence.saved).toBeGreaterThan(0);
      expect(m.label).toBeTruthy();
      // a label is read off the shape, never the other way round
      expect(label(m.def)).toBe(m.label);
    }
    // compression is exact on the whole corpus: every structure comes back with its hash
    for (const x of g.corpus) expect(hash(expandAll(compress(x.s, g.registry), g.registry))).toBe(hash(x.s));
    // the first morpheme: a relation at the packs' default confidence, derived, held true (what human languages call a textbook fact)
    const first = g.promoted[0]!.def;
    expect(first.k === 'R' && first.c.ev?.how).toBe('derived');
    expect(first.k === 'R' && first.c.cert?.lo).toBe(0.75);
    expect(first.k === 'R' && first.c.mode).toBe('true');
    expect(g.promoted[0]!.label).toMatch(/at 0.75 to 0.95, derived$/);
    // the corpus is each structure once, in the domain of the thing it was said of
    expect(new Set(corpusOf(substrate, laws).map((x) => JSON.stringify(x.s))).size).toBe(g.corpus.length);
    const said = sayGrammar(substrate, g);
    expect(said).toMatch(/^My grammar grows by description length: over the \d+ structures I hold, \d+ shapes recur across domains/);
    expect(said).toMatch(/I promoted 8, which shortened it by 1\d% \(\d+ to \d+ nodes\)/);
    expect(said).toMatch(/μ1 = part\(\$1, \$2\)\{cert:\{kind:interval lo:0.75 hi:0.95 source:epistemic\} ev:\{how:derived\} mode:true\} \(a part-of at 0.75 to 0.95, derived; \d+ times in \d+ domains; e.g. /);
  });
});

describe('Nex: rewrite rules beyond the canonical form (section U)', () => {
  it('a relation written backwards is the forward one with its arguments swapped; an undirected one does not care about their order; chains and contradictions see through both', () => {
    const forward = r('influence', [load, current], { dir: 1, polarity: '+', strength: 0.8 });
    const backward = r('influence', [current, load], { dir: -1, polarity: '+', strength: 0.8 });
    expect(equivalent(forward, backward)).toBe(true);
    expect(hash(forward)).toBe(hash(backward));
    expect(text(normalize(backward))).toBe('influence(load, current){dir:1 polarity:+ strength:0.8}');
    // not the same as the reverse influence, which is another claim
    expect(equivalent(forward, r('influence', [current, load], { dir: 1, polarity: '+', strength: 0.8 }))).toBe(false);
    // undirected: a correlation either way round is one structure
    expect(equivalent(r('support', [d('icecream'), d('drowning')], { dir: 0 }), r('support', [d('drowning'), d('icecream')], { dir: 0 }))).toBe(true);
    expect(equivalent(r('support', [d('a'), d('b')], { dir: 1 }), r('support', [d('b'), d('a')], { dir: 1 }))).toBe(false);
    // a chain written with its second link backwards composes the same
    const bcBack = r('influence', [temperature, current], { dir: -1, polarity: '+', strength: 0.5 });
    expect(hash(chain(forward, bcBack)!)).toBe(hash(chain(forward, r('influence', [current, temperature], { dir: 1, polarity: '+', strength: 0.5 }))!));
    // a contradiction is found whichever way the denial was written
    const denial = r('influence', [current, load], { dir: -1, polarity: '-' });
    expect(contradiction(forward, denial)?.c.mode).toBe('contradictory');
    // and the hard test still holds: renaming commutes with the rewrites
    const ren = scramble();
    expect(hash(rename(backward, ren))).toBe(hash(rename(forward, ren)));
  });
});

describe('Nex: the spoken form (section E) is the text read aloud, one word per glyph, heard back without loss', () => {
  it('speaks in English and Spanish and hears the same hash back over the corpus; a name that is a spoken word is said in quotes', () => {
    expect(speak(loadCurrent)).toBe('influence of load and current end with dir is 1 polarity is plus necessity is contributing strength is 0.8 cert is with kind is interval lo is 0.9 hi is 1 source is epistemic so time is with delay is 0.01 in s endin so ev is with how is measured src is list "a current reading" endlist so so');
    expect(speak(loadCurrent, 'es')).toMatch(/^influence de load y current fin con dir es 1 polarity es más /);
    const all: Structure[] = [loadCurrent, currentTemp, tempLife, ...LAWS.map(fromLaw), ...NODES.flatMap(fromNode), ...saidOf(substrate, 'bearing', laws), ...saidOf(substrate, 'bio.human', laws), ctx('believe', 'ego', r('kind', [d('end'), d('of')], { mode: 'unmeasured', instrument: 'so' })), r('quantity', [d('x'), d('n'), q(0.5, '-')], {}), r('influence', [d('a'), d('b')], { margin: -0.5, against: ['h1', 'h2'] }), t(d('cold'), d('hot'), { ev: { how: 'simulated' } }, [d('powered')]), e(loadCurrent, 'measured', 'a reading', { by: 'ego', at: q(3, 's') })];
    for (const x of all) for (const lang of ['en', 'es'] as const) expect(hash(hear(speak(x, lang), lang)), speak(x, lang)).toBe(hash(x));
    expect(speak(d('end'))).toBe('"end"');
    // the spoken form drops nothing for any listener: English for a child drops the numbers, the intervals and the delay
    expect(render(loadCurrent, 'en', 'child').dropped.length).toBeGreaterThan(0);
    expect(hash(hear(speak(loadCurrent)))).toBe(hash(loadCurrent));
  });
});

describe('Nex: cross-domain equivalence over the whole substrate, with the distance weighted by how rare a token is (sections R and V)', () => {
  it('unweighted, things cluster by the shape every textbook fact shares; weighted by rarity, a spring clusters with its kin and the spring-capacitor likeness is shown to have been shape, not content', () => {
    const fps = new Map<string, Map<string, number>>();
    const dom = new Map<string, string>();
    for (const e of substrate.entities.values()) {
      if (/^(?:kind|block|view|cross|param|scale)\./.test(e.id)) continue;
      const said = tune(saidOf(substrate, e.id, laws), 'energy');
      if (said.length < 2) continue;
      fps.set(e.id, fingerprint(e.id, said)); dom.set(e.id, e.domains[0] ?? '?');
    }
    expect(fps.size).toBeGreaterThan(400);
    const w = rarity(fps.values());
    // a token every fingerprint carries weighs nothing; a rare one weighs most
    expect(w.get('SELF')).toBe(0);
    expect(Math.max(...w.values())).toBeGreaterThan(3);
    const spring = fps.get('spring.helical')!, capacitor = fps.get('capacitor')!, seat = fps.get('seat') ?? fps.get('tool.blade') ?? fps.get('resist.photo')!;
    // measured 3 October: spring-capacitor 0.55 unweighted, 0.82 weighted; the unweighted nearness was the shape every derived relation shares
    expect(distance(spring, capacitor)).toBeLessThan(0.6);
    expect(distance(spring, capacitor, w)).toBeGreaterThan(0.75);
    expect(distance(spring, seat, w)).toBeGreaterThan(distance(spring, capacitor, w));
    // weighted, at 0.5, the spring's cluster is its kin (springs, a flexure, a belleville washer), never a seat or a photoresist
    const groups = cluster(fps, 0.5, w);
    const mine = groups.find((g) => g.includes('spring.helical'))!;
    expect(mine.filter((id) => /spring|flexure|belleville/.test(id)).length).toBeGreaterThanOrEqual(4);
    expect(mine).not.toContain('seat');
    expect(mine).not.toContain('resist.photo');
    // the cross-domain clusters that remain are content: biology's elastic proteins together, the lead screws with the lead-screw way
    const cross = groups.filter((g) => g.length >= 2 && new Set(g.map((id) => dom.get(id))).size >= 2);
    expect(cross.length).toBeGreaterThan(20);
    expect(cross.some((g) => g.includes('way.lead.screw') && g.some((id) => id.startsWith('leadscrew.')))).toBe(true);
  });
});

describe('Nex: the form of a law, with every symbol gone (section R at the level of the laws)', () => {
  it('five energies in three theories are one form; three powers are one; a difference, an exponential and an exponent that is an input have none', () => {
    const spring = lawById('spring.energy')!;
    const f = formOf(spring)!;
    expect(f.key).toBe('J:1,2');
    expect(sayForm(f)).toBe('an energy, one input times one input squared');
    // the physicist's analogy, from eval alone: E = ½ k x², ½ m v², ½ I ω², ½ C V², ½ L I²
    expect(sameForm(spring, LAWS).map((l) => l.id).sort()).toEqual(['capacitor.energy', 'energy.kinetic', 'energy.rotational', 'inductor.energy']);
    expect(sameForm(lawById('power.linear')!, LAWS).map((l) => l.id).sort()).toEqual(['power.electric', 'power.rotary']);
    expect(sameForm(lawById('ohm')!, LAWS).map((l) => l.id).sort()).toEqual(['motor.back-emf', 'seebeck']);
    expect(sameForm(lawById('drag.aero')!, LAWS).map((l) => l.id)).toEqual(['lift.aero']);
    // Carnot (1 − Tc/Th) looked like a power law at a 1 % step and is not; the rating life has its exponent as an input
    expect(formOf(lawById('carnot')!)).toBeNull();
    expect(formOf(lawById('bearing.life.l10')!)).toBeNull();
    // measured 3 October: 142 laws, 84 with a form, 58 forms, 13 shared; the same day, evaluated with the laws'
    // constants (every law with a g, a k or a σ had been evaluated as NaN and left without a form): 101, 72, 15
    const forms = lawForms(LAWS);
    expect([...forms.values()].reduce((n, v) => n + v.length, 0)).toBeGreaterThanOrEqual(100);
    expect([...forms.values()].filter((v) => v.length > 1).length).toBeGreaterThanOrEqual(15);
    // laws with constants have forms: the pendulum is a time under a root of its one input; Landauer an energy in one input
    expect(formOf(lawById('pendulum.period')!)?.key).toBe('s:0.5');
    expect(formOf(lawById('landauer')!)?.key).toBe('J:1');
    expect(sameForm(lawById('weight')!, LAWS).map((l) => l.id).sort()).toEqual(['buoyancy', 'friction.coulomb', 'grade.force', 'newton.second', 'rolling.resistance', 'traction.limit']);
    // a form is blind exactly where dimensions are: a torque and an energy are both N m, so m g h sits with T = F r
    expect(sameForm(lawById('energy.potential')!, LAWS).map((l) => l.id).sort()).toEqual(['beam.plastic-moment', 'motor.torque', 'wheel.torque']);
    // an output that does not move with an input at the example is no power of it: no form (gravitational time dilation at the example is 1 to within a billionth)
    expect(formOf(lawById('time.dilation.gravity')!)).toBeNull();
    // no word enters: a law renamed keeps its form
    expect(formOf({ ...spring, id: 'x', name: 'y', formula: 'z' })!.key).toBe(f.key);
  });
});

describe('Nex Space (docs/NEX-SPACE.md): continuous exactly where a law gives coordinates, decided by evidence elsewhere', () => {
  const l10 = () => family(lawById('bearing.life.l10')!, 'P', { C: 14.8, p: 3 });
  let seed = 7;
  const rnd = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };

  it('a family is lazy and adaptive: the law generates each point when asked, and its edge is found by bisection to a millionth in a couple of dozen evaluations', () => {
    const f = l10();
    expect(f.value(1)).toBeCloseTo(3.2418e9, -5);
    expect(f.sensitivity(2)).toBeCloseTo(-3, 2);
    expect(f.admissible(8).ok).toBe(false);
    const e = f.edge(1, 20)!;
    // measured 3 October: the rating-life law stops at P/C = 0.5, P = 7.4 N, in 24 evaluations
    expect(e.at).toBeCloseTo(7.4, 4);
    expect(e.evaluations).toBeLessThan(40);
    expect(e.why).toMatch(/past half the dynamic rating/);
    expect(f.edge(1, 2)).toBeNull(); // both inside: no edge between them
    const tr = family(lawById('traction.limit')!, 'mu', { N: 600 });
    expect(tr.edge(0.8, 3)!.at).toBeCloseTo(1.6, 4);
    // the structure at a point is the law's structure at that point, in mode true inside and outside-domain outside, with the reason under it
    const inside = f.at(1), outside = f.at(8);
    expect(inside.c.mode).toBe('true');
    expect(outside.c.mode).toBe('outside-domain');
    expect(outside.c.under?.[0]).toMatch(/past half/);
    expect(hash(read(text(inside)))).toBe(hash(inside));
  });

  it('interpolation is admitted only along a shared coordinate: refused between dimensions, between two distinctions, and when more than one input differs', () => {
    const f = l10();
    const b = between(f.at(1), f.at(2), laws);
    expect(b.ok && b.sym).toBe('P');
    expect(b.ok && b.law.id).toBe('bearing.life.l10');
    expect(between(q(100, 'J'), q(300, 'K'), laws)).toMatchObject({ ok: false, mode: 'undefined' });
    expect(between(d('motor'), d('bearing'), laws)).toMatchObject({ ok: false, mode: 'undefined' });
    expect(between(q(1, 'm'), q(2, 'm'), laws)).toMatchObject({ ok: false, mode: 'unknown' });
    const g = family(lawById('bearing.life.l10')!, 'P', { C: 20, p: 3 });
    expect(between(f.at(1), g.at(2), laws)).toMatchObject({ ok: false, mode: 'unknown' });
    expect(between(f.at(1), f.at(1), laws)).toMatchObject({ ok: false, mode: 'unknown' });
  });

  it('continuous or discrete by evidence: three human labels on one law are one continuum; two laws under one smooth curve are two regimes with their boundary; noise is never split', () => {
    const f = l10();
    // the hidden continuum: rating life at loads, labelled by a human cut, 2 % noise
    const cont = Array.from({ length: 24 }, (_, i) => { const P = 0.5 + i * 0.25; return { x: P, y: f.value(P) * (1 + 0.02 * (rnd() - 0.5)), label: P < 2 ? 'light' : P < 4.5 ? 'medium' : 'heavy' }; });
    const v1 = regimes(cont);
    expect(v1.regimes.length).toBe(1);
    expect(v1.regimes[0]!.exponent).toBeCloseTo(-3, 1);
    expect(v1.labelsAreOneContinuum).toBe(true);
    // the hidden regimes: the pipe friction factor, 64/Re laminar below 2300 and Blasius 0.316 Re^-0.25 above, one smooth-looking curve
    const reg = Array.from({ length: 30 }, (_, i) => { const Re = 300 * 1.2 ** i; return { x: Re, y: (Re < 2300 ? 64 / Re : 0.316 * Re ** -0.25) * (1 + 0.02 * (rnd() - 0.5)) }; });
    const v2 = regimes(reg);
    expect(v2.regimes.length).toBe(2);
    expect(v2.regimes[0]!.exponent).toBeCloseTo(-1, 1);
    expect(v2.regimes[1]!.exponent).toBeCloseTo(-0.25, 1);
    expect(v2.boundaries[0]!).toBeGreaterThan(2229);
    expect(v2.boundaries[0]!).toBeLessThan(2675);
    expect(v2.length.chosen).toBeLessThan(v2.length.oneRegime);
    // the verdict is a structure: a state of approximate power laws with the boundary under it
    const vs = verdictStructure(v2, 'f');
    expect(vs.k === 'R' && vs.op).toBe('state');
    expect(vs.k === 'R' && vs.c.under?.[0]).toMatch(/^boundary at 2\.4/);
    // noise buys no boundary, and ten per cent noise changes neither verdict
    expect(regimes(Array.from({ length: 20 }, (_, i) => ({ x: 1 + i, y: 1 + rnd() }))).regimes.length).toBe(1);
    expect(regimes(cont.map((p) => ({ ...p, y: p.y * (1 + 0.1 * (rnd() - 0.5)) }))).regimes.length).toBe(1);
    expect(regimes(reg.map((p) => ({ ...p, y: p.y * (1 + 0.1 * (rnd() - 0.5)) }))).regimes.length).toBe(2);
  });
});

describe('Discovery (docs/NEX-DISCOVERY.md): human knowledge as evidence, impossibility only by certificate, anomalies kept alive', () => {
  it('impossible only with a certificate: a bounding law inside its domain, the claim beyond the bound, the assumptions under it; else the precise weaker mode', () => {
    const c = certificate({ quantity: 'efficiency', value: 0.5, unit: '-', inputs: { Tc: 300, Th: 400 } });
    expect(c.impossible).toBe(true);
    if (!c.impossible) return;
    expect(c.law.id).toBe('carnot');
    expect(c.bound).toBeCloseTo(0.25, 12);
    expect(c.sense).toBe('most');
    expect(c.assumptions[0]).toMatch(/^Carnot efficiency holds: Reversible limit/);
    expect(c.assumptions).toContain('cold side = 300');
    expect(c.derivation).toMatch(/gives at most 0\.25 -; the claim is 0\.5 -; so assumptions \+ law \+ claim ⇒ ⊥$/);
    expect(c.structure.c.mode).toBe('impossible-under');
    expect(text(c.structure)).toMatch(/^contradict\(quantity\(eta, 0\.5\[-\]\)\{ev:\{how:hypothesized\}\}, quantity\(eta, 0\.25\[-\]\)/);
    expect(text(c.structure)).toMatch(/mode:impossible-under under:\["Carnot efficiency holds/);
    // inside the bound: consistent, said with the ceiling
    expect(certificate({ quantity: 'efficiency', value: 0.2, unit: '-', inputs: { Tc: 300, Th: 400 } })).toMatchObject({ impossible: false, mode: 'true', bound: 0.25 });
    // the law outside its domain: outside-domain, never impossible
    expect(certificate({ quantity: 'efficiency', value: 0.2, unit: '-', inputs: { Tc: 400, Th: 300 } })).toMatchObject({ impossible: false, mode: 'outside-domain' });
    // a floor: nothing erases a bit for nothing
    const l = certificate({ quantity: 'energy per bit erased', value: 0, unit: 'J', inputs: { T: 300 } });
    expect(l.impossible && l.sense).toBe('least');
    expect(l.impossible && l.law.id).toBe('landauer');
    // an equality law computes the quantity: a claim beyond its value, at the claim's word, is contradicted too
    const k = certificate({ quantity: 'kinetic energy', value: 1e6, unit: 'J', inputs: { m: 1, v: 1 } });
    expect(k.impossible && k.sense).toBe('equal');
    expect(k.impossible && k.derivation).toBe('Kinetic energy (E = ½ m v²) at these inputs gives 0.5 J; the claim is 1000000 J, beyond the claim taken at its word; so assumptions + law + claim ⇒ ⊥');
    // inputs a law needs missing, or no law at all: unknown, not impossible; a unit I cannot read: undefined
    expect(certificate({ quantity: 'kinetic energy', value: 1e6, unit: 'J', inputs: { m: 1 } })).toMatchObject({ impossible: false, mode: 'unknown', why: expect.stringMatching(/^Kinetic energy reaches kinetic energy but needs speed \(v\)/) });
    expect(certificate({ quantity: 'harvest mass', value: 1, unit: 'kg', inputs: {} })).toMatchObject({ impossible: false, mode: 'unknown', why: expect.stringMatching(/^no law of mine computes or bounds harvest mass/) });
    // a domain check that reads the law's constants (G and c in gravitational time dilation) is given them: a solar
    // mass inside 1 km is past its horizon, outside-domain, never a verdict; before, G and c were undefined there and
    // the check passed in silence
    expect(certificate({ quantity: 'clock rate against far away', value: 0.5, unit: '-', inputs: { M: 2e30, r: 1000 } })).toMatchObject({ impossible: false, mode: 'outside-domain' });
    expect(family(lawById('time.dilation.gravity')!, 'r', { M: 2e30 }).admissible(1000).ok).toBe(false);
    expect(family(lawById('time.dilation.gravity')!, 'r', { M: 2e30 }).admissible(1e7).ok).toBe(true);
    expect(certificate({ quantity: 'efficiency', value: 0.5, unit: 'furlongs', inputs: { Tc: 300, Th: 400 } })).toMatchObject({ impossible: false, mode: 'undefined' });
    // a given that is not a number is undefined, never a verdict and never a crash
    expect(certificate({ quantity: 'efficiency', value: 0.2, unit: '-', inputs: { Tc: NaN, Th: 400 } })).toMatchObject({ impossible: false, mode: 'undefined', why: 'Tc = NaN is not a number' });
    expect(certificate({ quantity: 'efficiency', value: NaN, unit: '-', inputs: { Tc: 300, Th: 400 } })).toMatchObject({ impossible: false, mode: 'undefined' });
    // one word, two laws: "energy" with a mass, a speed and a height is entailed by the kinetic law and said with the potential law that disagrees
    const two = certificate({ quantity: 'energy', value: 290.4, unit: 'J', inputs: { m: 120, v: 2.2, h: 1 } });
    expect(two).toMatchObject({ impossible: false, mode: 'true' });
    expect(two.impossible ? '' : two.why).toBe('Kinetic energy gives 290.4 J at these inputs and the claim is 290.4 J, within the claim taken at its word (Gravitational potential energy also reaches energy with these inputs and gives 1177 J: the word names two quantities here)');
  });

  it('every law signs only what it computes: the ten bound laws admit their example and certify ten per cent beyond it; every equality law entails its example and contradicts ten times it; inputs missing sign nothing', () => {
    const bound = LAWS.filter((l) => boundSense(l));
    expect(bound.map((l) => l.id).sort()).toEqual(['carnot', 'cornering.limit', 'diffraction.limit', 'friction.coulomb', 'landauer', 'rayleigh.resolution', 'separation.work', 'shaft.diameter.static', 'shannon.sampling', 'traction.limit']);
    let equalities = 0, bounds = 0;
    for (const law of LAWS) {
      if (!applicable(law, law.example.inputs) || law.outside?.(law.example.inputs) || law.example.output === 0) continue;
      const claim = (value: number) => certificate({ quantity: law.output.name, value, unit: law.output.unit, inputs: law.example.inputs });
      const at = claim(law.example.output);
      expect(at.impossible, law.id).toBe(false);
      expect(at.mode, law.id).toBe('true');
      const sense = boundSense(law);
      const beyond = claim(law.example.output * (sense === 'most' ? 1.1 : sense === 'least' ? 0.9 : 10));
      expect(beyond.impossible, law.id).toBe(true);
      expect(beyond.impossible && beyond.sense, law.id).toBe(sense ?? 'equal');
      if (sense) bounds++; else equalities++;
    }
    expect(bounds).toBe(10);
    expect(equalities).toBeGreaterThan(100);
  });

  it('the states that are not false hash apart and never contradict a truth; only false does', () => {
    const base = r('quantity', [d('a'), q(1, 'J')], {});
    const modes = ['true', 'false', 'unknown', 'unobserved', 'unmodelled', 'unmeasured', 'insufficient', 'impossible-under', 'outside-domain'] as const;
    expect(new Set(modes.map((m) => hash({ ...base, c: { mode: m } }))).size).toBe(modes.length);
    expect(modes.filter((m) => contradiction({ ...base, c: { mode: 'true' } }, { ...base, c: { mode: m } }))).toEqual(['false']);
  });

  it('the epistemic vector holds evidence, theory and coverage apart; a contradicting measurement is never erased by a supporting one', () => {
    const claim = { quantity: 'efficiency', value: 0.2, unit: '-', inputs: { Tc: 300, Th: 400 } };
    const h = r('quantity', [d('bearing'), d('eta'), q(0.2, '-')], { ev: { how: 'measured', src: ['bench A'] } });
    const other = e(r('quantity', [d('bearing'), d('eta'), q(0.3, '-')], {}), 'measured', 'bench B');
    const replication = e(r('quantity', [d('bearing'), d('eta'), q(0.2, '-')], {}), 'measured', 'bench C');
    const v = epistemic(h, { substrate, corpus: [replication, r('contradict', [h, other], { mode: 'contradictory' })], claim });
    expect(v.empirical).toEqual({ replication: 2, against: 1 });
    expect(labelOf(v).physical).toBe('contested: measurements both ways (2 for, 1 against)');
    // without the contradiction: two independent sources, bounded by Carnot: established, by structure, not by a decimal
    const v2 = epistemic(h, { substrate, corpus: [replication], claim });
    expect(v2).toMatchObject({ formal: 'none', empirical: { replication: 2, against: 0 }, simulation: 0, calibration: 0, theory: 'bounded', domain: 'inside', uncertainty: null });
    expect(v2.discrepancy).toBeCloseTo(0.2, 9);
    expect(labelOf(v2).physical).toBe('established: bounded by a law, replicated');
    // one source twice is one source
    const v3 = epistemic(h, { substrate, corpus: [e(proposition(h), 'measured', 'bench A')], claim });
    expect(v3.empirical.replication).toBe(1);
    expect(labelOf(v3).physical).toBe('consistent: bounded by a law, measured once');
  });

  it('evidence species are not one ladder: a theorem, a measurement and a simulation render apart, and no threshold turns one into another; renaming moves coverage and no physical label', () => {
    const claim = { quantity: 'efficiency', value: 0.2, unit: '-', inputs: { Tc: 300, Th: 400 } };
    const base = r('quantity', [d('bearing'), d('eta'), q(0.2, '-')], {});
    const by = (how: 'theorem' | 'measured' | 'simulated' | 'estimated', src: string) => epistemic({ ...base, c: { ev: { how, src: [src] } } }, { substrate, claim });
    expect(by('theorem', 'a proof')).toMatchObject({ formal: 'theorem', empirical: { replication: 0, against: 0 }, simulation: 0 });
    expect(by('measured', 'a bench')).toMatchObject({ formal: 'none', empirical: { replication: 1, against: 0 }, simulation: 0 });
    expect(by('simulated', 'the engine')).toMatchObject({ formal: 'none', empirical: { replication: 0, against: 0 }, simulation: 1 });
    expect(labelOf(by('theorem', 'a proof')).physical).toBe('consistent: bounded by a law, by theorem');
    expect(labelOf(by('measured', 'a bench')).physical).toBe('consistent: bounded by a law, measured once');
    expect(labelOf(by('simulated', 'the engine')).physical).toBe('consistent: bounded by a law, in simulation');
    expect(labelOf(by('estimated', 'a handbook')).physical).toBe('consistent: bounded by a law, in a fitted model');
    // the first law of discovery: coverage is a coordinate of its own, and the physical label never reads it
    const named = { ...base, c: { ev: { how: 'measured' as const, src: ['a bench'] } } };
    const a = epistemic(named, { substrate, claim }), b = epistemic(rename(named, (id) => `coined.${id}`), { substrate, claim });
    expect(a.coverage).toBeGreaterThan(0.5);
    expect(b).toEqual({ ...a, coverage: 0 });
    expect(labelOf(a).physical).toBe(labelOf(b).physical);
    expect(labelOf(b).novelty).toBe('unseen by sources');
    expect(labelOf(a).novelty).not.toBe('unseen by sources');
    // the same claim beyond the bound: unmeasured it is a radical hypothesis; measured once an anomaly; replicated a replicated anomaly
    const beyond = { ...claim, value: 0.5 };
    const hyp = r('quantity', [d('bearing'), d('eta'), q(0.5, '-')], { ev: { how: 'hypothesized' } });
    expect(labelOf(epistemic(hyp, { substrate, claim: beyond })).physical).toBe('radical hypothesis: contradicted by a law, unmeasured');
    const once = { ...hyp, c: { ev: { how: 'measured' as const, src: ['rig 1'] } } };
    expect(labelOf(epistemic(once, { substrate, claim: beyond })).physical).toBe('anomaly, measured once: contradicted by a law');
    expect(labelOf(epistemic(once, { substrate, claim: beyond, corpus: [e(proposition(once), 'measured', 'rig 2')] })).physical).toBe('replicated anomaly: measured by independent sources, contradicted by a law');
    // nothing known, nothing measured, no claim against a law: untested, not false
    expect(labelOf(epistemic(r('quantity', [d('zorb'), d('eta'), q(0.5, '-')], {}), { substrate })).said).toBe('untested; unseen by sources');
  });

  it('a compound claim is factored: a measured thrust supports the thrust and the device, never the mechanism it credits', () => {
    const compound = e(r('quantity', [d('device'), d('thrust'), q(4, 'N')], { mech: 'X' }), 'measured', 'bench');
    const parts = factor(compound);
    expect(parts.map((p) => p.role)).toEqual(['exists', 'quantity', 'mechanism']);
    expect(parts[0]!.support.replication).toBe(1);
    expect(parts[1]!.support.replication).toBe(1);
    expect(parts[2]!.support).toMatchObject({ replication: 0, formal: 'none', for: [] });
    expect(text(parts[2]!.s)).toBe('influence(X, quantity(device, thrust, 4[N])){dir:1}');
    // evidence placed on the mechanism in its own right reaches it
    const onMech = e(r('influence', [d('X'), r('quantity', [d('device'), d('thrust'), q(4, 'N')], {})], { dir: 1 }), 'derived', 'a model of X');
    expect(factor(compound, [onMech])[2]!.support.formal).toBe('derived');
    // and the claim as a whole, crediting a mechanism the book lacks, requires an extension
    expect(theory({ quantity: 'thrust', value: 4, unit: 'N', inputs: {}, mechanism: 'X' }).relation).toBe('requires-extension');
  });

  it('the relation to the laws is typed: entailed, bounded, contradicted, outside-domain, untested, unrelated, requires-extension, undefined', () => {
    const rel = (c: Parameters<typeof theory>[0]) => theory(c).relation;
    expect(rel({ quantity: 'kinetic energy', value: 290.4, unit: 'J', inputs: { m: 120, v: 2.2 } })).toBe('entailed');
    expect(rel({ quantity: 'efficiency', value: 0.2, unit: '-', inputs: { Tc: 300, Th: 400 } })).toBe('bounded');
    const wrong = theory({ quantity: 'kinetic energy', value: 500, unit: 'J', inputs: { m: 120, v: 2.2 } });
    expect(wrong.relation).toBe('contradicted');
    expect(wrong.why).toBe('Kinetic energy (E = ½ m v²) at these inputs gives 290.4 J; the claim is 500 J, beyond the claim taken at its word; so assumptions + law + claim ⇒ ⊥');
    // a stated uncertainty is the claim's own: 300 J at 5 % is entailed, at 1 % contradicted
    expect(rel({ quantity: 'kinetic energy', value: 300, unit: 'J', inputs: { m: 120, v: 2.2 }, rel: 0.05 })).toBe('entailed');
    expect(rel({ quantity: 'kinetic energy', value: 300, unit: 'J', inputs: { m: 120, v: 2.2 }, rel: 0.01 })).toBe('contradicted');
    expect(rel({ quantity: 'efficiency', value: 0.2, unit: '-', inputs: { Tc: 400, Th: 300 } })).toBe('outside-domain');
    expect(theory({ quantity: 'kinetic energy', value: 300, unit: 'J', inputs: { m: 120 } })).toMatchObject({ relation: 'untested', why: expect.stringMatching(/needs speed \(v\)/) });
    expect(rel({ quantity: 'harvest mass', value: 1, unit: 'kg', inputs: {} })).toBe('unrelated');
    expect(rel({ quantity: 'kinetic energy', value: 290.4, unit: 'J', inputs: { m: 120, v: 2.2 }, mechanism: 'telekinesis' })).toBe('requires-extension');
    expect(rel({ quantity: 'kinetic energy', value: 290.4, unit: 'J', inputs: { m: 120, v: 2.2 }, mechanism: 'energy.kinetic' })).toBe('entailed');
    expect(rel({ quantity: 'efficiency', value: 0.5, unit: 'furlongs', inputs: { Tc: 300, Th: 400 } })).toBe('undefined');
  });

  it('a residual is one component or several: two near-misses at 0.8 of tolerance are one anomaly together (1.13), which no scalar sees', () => {
    const one = anomaly('p', { value: 1.08, tolerance: 0.1, instrument: 'i', environment: 'e' }, { value: 1, lawAncestry: [], modelVersion: 'v' });
    expect(one.residual.kind).toBe('scalar');
    expect(one.status).toBe('within tolerance');
    expect(one.sigma).toBeCloseTo(0.8, 9);
    const two = anomaly('pq', { value: [1.08, 1.08], tolerance: 0.1, names: ['period', 'amplitude'], instrument: 'i', environment: 'e' }, { value: [1, 1], lawAncestry: [], modelVersion: 'v' });
    expect(two.residual.kind).toBe('vector');
    expect(two.sigma).toBeCloseTo(Math.hypot(0.8, 0.8), 9);
    expect(two.status).toBe('alive');
    expect(two.candidates[0]!.says).toBe('the residual is 1.13 times the declared tolerance over 2 components together: not noise at the tolerance declared');
    expect(text(two.structure)).toMatch(/^contradict\(E\(state\(quantity\(pq:(?:period|amplitude):observed, 1\.08\), quantity\(pq:(?:period|amplitude):observed, 1\.08\)\)\)/);
    expect(() => anomaly('bad', { value: [1, 2], tolerance: 0.1, instrument: 'i', environment: 'e' }, { value: 1, lawAncestry: [], modelVersion: 'v' })).toThrow(/2 observed components against 1 predicted/);
  });

  it('anomalies cluster by what they share in the graph, not by how they look: two against one law with different magnitudes and instruments belong together; one against another law stands alone', () => {
    const l10 = (id: string, k: number, instrument: string) => anomaly(id, { value: 12.5 * k, tolerance: 0.05, instrument, environment: 'bench' }, { value: 12.5, lawAncestry: ['bearing.life.l10'], modelVersion: 'v' });
    const a = l10('a', 2, 'rig 1'), b = l10('b', 1.5, 'rig 2'), within = l10('w', 1.01, 'rig 3');
    const c = anomaly('c', { value: 0.5, tolerance: 0.05, instrument: 'rig 1', environment: 'bench' }, { value: 0.25, lawAncestry: ['carnot'], modelVersion: 'v' });
    const clusters = clusterAnomalies([a, c, b, within]);
    expect(clusters.map((x) => [...x.members].sort())).toEqual([['a', 'b'], ['c']]);
    expect(clusters[0]).toMatchObject({ ancestry: ['bearing.life.l10'], parameters: ['C:up', 'P:down', 'p:up'] });
    expect(clusters[0]!.why).toBe('2 anomalies descend from bearing.life.l10; each closes with C up, P down, p up');
    expect(clusters[1]!.why).toBe('shares its ancestry with no other anomaly');
  });

  it('the skeptic derives its candidates from the law\'s graph where it can (inputs, constants, domain, ancestry), computed and marked graph; the standing checklist is marked as such', () => {
    const a = anomaly('g', { value: 2.2, tolerance: 0.01, instrument: 'rig', environment: 'bench' }, { value: 2.0064, lawAncestry: ['pendulum.period'], modelVersion: 'v' });
    expect(a.candidates.filter((c) => c.source === 'graph').map((c) => c.kind)).toEqual(['within uncertainty', 'model envelope', 'parameter', 'constant']);
    // the family of a law with a constant (g) evaluates with it: the length that would close the gap, inside its range
    const L = a.candidates.find((c) => c.kind === 'parameter')!;
    expect(L.says).toBe('Pendulum period: the gap closes if length (L) were 1.2 m instead of 1 m, inside its range');
    expect(family(lawById('pendulum.period')!, 'L', {}).value(1)).toBeCloseTo(2.0064, 4);
    expect(family(lawById('pendulum.period')!, 'L', {}).sensitivity(1)).toBeCloseTo(0.5, 6);
    const g = a.candidates.find((c) => c.kind === 'constant')!;
    expect(g.says).toBe('Pendulum period: the gap closes if standard gravity (ISO 80000-3) (g) were 8.16 m/s^2 instead of 9.80665 m/s^2; a constant is not free, so this says the law was mis-stated, not that the constant moved');
    expect(g).toMatchObject({ computed: true, closes: false, input: 'g', direction: 'down' });
    expect(a.candidates.filter((c) => c.source === 'checklist').map((c) => c.kind)).toEqual(['numerical artifact', 'hidden variable', 'sensor defect', 'selection bias', 'wrong causal direction', 'bad assumption', 'conventional theory']);
    // an ancestor that is no law of the book is named as such, never silently skipped
    expect(anomalies().find((x) => x.id.endsWith('against-froude'))!.candidates.find((c) => c.kind === 'upstream law')?.says).toMatch(/^scale\.froude: an ancestor of the prediction that is not a law of the book/);
  });

  it('the register: eleven observations against the law book, none alive, one explained (a cooling time against Froude, 54 times the tolerance), the rest within tolerance; an anomaly keeps its skeptic', () => {
    const as = anomalies();
    expect(as.length).toBe(11);
    expect(alive(as)).toEqual([]);
    const beyond = as.filter((a) => a.sigma > 1);
    expect(beyond.map((a) => [a.id, a.status])).toEqual([['observation.cooling-size:against-froude', 'explained']]);
    expect(beyond[0]!.sigma).toBeGreaterThan(50);
    expect(beyond[0]!.candidates.find((c) => c.kind === 'parameter')?.says).toBe('the observation would be exact if the exponent were 1.125 instead of 0.5');
    expect(beyond[0]!.structure.k === 'R' && beyond[0]!.structure.c.under?.[1]).toMatch(/^explained: the thermal world is not Froude-similar/);
    for (const a of as.filter((x) => x.sigma <= 1)) expect(a.status).toBe('within tolerance');
    // a synthetic anomaly: twice the rating life the law predicts, at 5 %
    const syn = anomaly('probe.l10', { value: 25, tolerance: 0.05, instrument: 'probe', environment: 'bench' }, { value: 12.5, lawAncestry: ['bearing.life.l10'], modelVersion: 'probe' });
    expect(syn.status).toBe('alive');
    expect(syn.sigma).toBe(20);
    expect(syn.candidates[0]).toMatchObject({ kind: 'within uncertainty', computed: true, closes: false });
    const P = syn.candidates.find((c) => c.kind === 'parameter' && c.says.includes('(P)'));
    expect(P?.says).toBe('Bearing rating life (L10): the gap closes if equivalent dynamic load (P) were 0.794 N instead of 1 N, inside its range');
    expect(P?.closes).toBe(true);
    expect(syn.candidates.filter((c) => !c.computed).map((c) => c.kind)).toEqual(['model envelope', 'numerical artifact', 'hidden variable', 'sensor defect', 'selection bias', 'wrong causal direction', 'bad assumption', 'conventional theory']);
    for (const c of syn.candidates) expect(c.settledBy.length).toBeGreaterThan(0);
    expect(text(syn.structure)).toMatch(/^contradict\(E\(quantity\(probe\.l10:observed, 25\)\)\{how:measured src:probe by:bench\}, quantity\(probe\.l10:predicted, 12\.5\)/);
    expect(text(syn.structure)).toMatch(/mode:contradictory under:\["model probe"\] margin:20\}$/);
  });
});

describe('the shape of a law without its names (docs/NEX-TOPOLOGY.md)', () => {
  it('every law with a power form is dimensionally homogeneous once its constants are counted: no hidden dimensional number in any law', () => {
    const shaped = LAWS.map((l) => [l, shapeOf(l)] as const).filter((x): x is readonly [(typeof LAWS)[number], Shape] => !!x[1]);
    expect(shaped.length).toBeGreaterThan(90);
    const broken = shaped.filter(([, s]) => !isDimless(s.residual)).map(([l, s]) => `${l.id} ${s.residual.join(',')}`);
    expect(broken).toEqual([]);
  });
  it('weight and Newton\'s second law are one shape, and a constant is an input the theory holds fixed: Landauer\'s limit (k T ln 2) joins the bilinear laws one level up', () => {
    const w = shapeOf(lawById('weight')!)!, n = shapeOf(lawById('newton.second')!)!;
    expect(shapeKey(w, 0)).toBe(shapeKey(n, 0));
    const landauer = shapeOf(lawById('landauer')!)!;
    expect(landauer.terms.filter((t) => t.held)).toHaveLength(1);
    expect(isDimless(landauer.residual)).toBe(true);
    const peers = LAWS.filter((l) => { const s = shapeOf(l); return s && shapeKey(s, 1) === shapeKey(landauer, 1) && l.id !== 'landauer'; }).map((l) => l.id);
    expect(peers.length).toBeGreaterThan(0);
    expect(peers.every((id) => !shapeOf(lawById(id)!)!.terms.some((t) => t.held))).toBe(true);
  });
  it('forgetting is the generalisation: at the finest level no shared shape crosses a human domain, one level up several do', () => {
    const at = (level: 0 | 1 | 2) => { const m = new Map<string, (typeof LAWS)[number][]>(); for (const l of LAWS) { const s = shapeOf(l); if (s) m.set(shapeKey(s, level), [...(m.get(shapeKey(s, level)) ?? []), l]); } return [...m.values()].filter((v) => v.length > 1); };
    const crossing = (shared: (typeof LAWS)[number][][]) => shared.filter((v) => new Set(v.map((l) => l.domain)).size > 1);
    const l0 = at(0), l1 = at(1), l2 = at(2);
    // measured 3 October 2026: level 0: 95 classes over 101 laws, 5 shared, 0 crossing; level 1: 72 classes, 15 shared, 8 crossing; level 2: 30 classes, 15 shared, 14 crossing
    console.log(`shared shapes: level 0 ${l0.length} (crossing ${crossing(l0).length}), level 1 ${l1.length} (crossing ${crossing(l1).length}), level 2 ${l2.length} (crossing ${crossing(l2).length})`);
    expect(crossing(l0).length).toBe(0);
    expect(crossing(l1).length).toBeGreaterThan(0);
    expect(crossing(l2).length).toBeGreaterThanOrEqual(crossing(l1).length);
    // the energies of five theories are one shape one level up, and nothing of their names was used
    const energies = l1.find((v) => v.some((l) => l.id === 'energy.kinetic'))!.map((l) => l.id).sort();
    expect(energies).toEqual(['capacitor.energy', 'energy.kinetic', 'energy.rotational', 'inductor.energy', 'spring.energy']);
  });
});

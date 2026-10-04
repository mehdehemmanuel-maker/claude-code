// The construction layer (src/construct): laws that bear by relevance, derive typed facts, and grow from the law book;
// assemblies whose coordinates are results of relations, resolved in dependency order on the real ground; the person
// the world is built for as the source of every size an artefact for a person takes.

import { describe, expect, it } from 'vitest';
import { CONSTRUCTION_LAWS, defaultOf, derive, discoverSpacing, executable, relevant, stockFor, type Subject } from '../../src/construct/laws';
import { order, toForge, rolesOf, type Assembly } from '../../src/construct/assembly';
import { PERSON, round5 } from '../../src/data/people';
import { constructionHash, discovery as constructionDiscovery } from '../../src/construct/laws';
import { evalTerm, TERMS } from '../../src/ganglia/native/terms';
import { text } from '../../src/ganglia/native/text';
import { d, r } from '../../src/ganglia/native/core';
import { substrate } from '../../src/ganglia/substrate';
import { citations, lawChanged } from '../../src/ganglia/dependencies';
import { DEFAULTS, design } from '../../src/assistant/designer';
import { buildTest, overturning, PUSH } from '../../src/mind';
import { getMaterial } from '../../src/data/materials';
import { Bench } from '../../src/app/bench';
import { BuildHost } from '../../src/forge/apphost';
import { run } from '../../src/forge/forge';
import { newDoc } from '../../src/doc/commands';

const subject = (over: Partial<Subject>): Subject => ({ kinds: [], roles: [], flows: [], materials: [], ...over });

describe('construction laws', () => {
  it('every facet of the seed tree is a law, each knows its family, and the derived ones are a measured subset of the named', () => {
    const { derived, named } = executable();
    expect(CONSTRUCTION_LAWS.length).toBe(derived.length + named.length);
    expect(derived.length).toBeGreaterThanOrEqual(12);
    expect(new Set(CONSTRUCTION_LAWS.map((l) => l.id)).size).toBe(CONSTRUCTION_LAWS.length);
    for (const fam of ['existence', 'spatial', 'geometric', 'scale', 'material', 'chemical', 'mechanical', 'electrical', 'thermal', 'fluid', 'information', 'control', 'interface', 'environmental', 'manufacturing', 'biological']) expect(CONSTRUCTION_LAWS.some((l) => l.family === fam), fam).toBe(true);
    console.log(`construction laws: ${derived.length} derived, ${named.length} named only`);
  });

  it('relevance is automatic: a wheel in contact and moving wakes the mechanical family and no chemistry; a battery wakes chemical, electrical and thermal; an organism the biological', () => {
    const wheel = relevant(subject({ kinds: ['wheel'], flows: ['rotation', 'travel'], materials: ['rubber.natural'], contact: true, moving: true }));
    const fams = (ls: typeof wheel) => new Set(ls.map((l) => l.family));
    expect(fams(wheel).has('mechanical')).toBe(true);
    expect(fams(wheel).has('chemical')).toBe(false);
    expect(fams(wheel).has('biological')).toBe(false);
    const battery = relevant(subject({ kinds: ['battery'], flows: ['electric', 'chemical', 'heat'], materials: ['lead'] }));
    for (const f of ['chemical', 'electrical', 'thermal', 'material', 'interface']) expect(fams(battery).has(f as never), f).toBe(true);
    expect(fams(relevant(subject({ kinds: ['organism'] }))).has('biological')).toBe(true);
    expect(fams(relevant(subject({ kinds: ['block'] }))).has('biological')).toBe(false);
  });

  it('what a law derives is typed and sourced: a post gets its footprint inset and fixity factor, a long rubber part its rigid-length limit, wood its stock', () => {
    const post = derive(subject({ kinds: ['post'], roles: ['support'], flows: ['load'], materials: ['wood.douglas-fir'], length: 0.038 }));
    expect(post.find((d) => d.out.kind === 'factor' && d.out.what === 'inset')?.out).toMatchObject({ value: 0.038 / 2 + 0.01 });
    expect(post.find((d) => d.out.kind === 'factor' && d.out.what === 'K')?.out).toMatchObject({ value: 2 });
    expect(derive(subject({ roles: ['support', 'braced'], flows: ['load'] })).find((d) => d.out.kind === 'factor' && d.out.what === 'K')?.out).toMatchObject({ value: 1 });
    const band = derive(subject({ kinds: ['band'], materials: ['rubber.natural'], length: 1 }));
    const limit = band.find((d) => d.out.kind === 'limit' && /rigid length/.test(d.out.what))!.out as { value: number };
    expect(limit.value).toBeCloseTo(0.4465, 2);
    const stock = derive(subject({ materials: ['wood.douglas-fir'] })).find((d) => d.out.kind === 'stock')!.out as { kinds: string[] };
    expect(stock.kinds).toContain('lumber');
    expect(stock.kinds).not.toContain('tube.square');
    expect(stockFor(getMaterial('steel.a36'))).toContain('tube.square');
  });

  it('the person is the source of every size an artefact for a person takes, and the defaults are the law\'s derivations', () => {
    const p = subject({ forPerson: true });
    expect(defaultOf(p, 'seat height')).toBe(round5(PERSON.poplitealHeight.value + PERSON.shoe.value));
    expect(defaultOf(p, 'work surface height')).toBe(round5(PERSON.poplitealHeight.value + PERSON.shoe.value + PERSON.elbowRestHeight.value));
    expect(DEFAULTS.chair.height).toBe(defaultOf(p, 'seat height'));
    expect(DEFAULTS.table.height).toBe(defaultOf(p, 'work surface height'));
    expect(DEFAULTS.table.width).toBe(2 * defaultOf(p, 'place at a table')!);
    expect(DEFAULTS.bridge.depth).toBe(defaultOf(p, 'passage width'));
    expect(DEFAULTS.ladder.load).toBe(PERSON.designMass.value);
    for (const m of Object.values(PERSON)) expect(['handbook', 'standard', 'estimate']).toContain(m.kind);
  });

  it('the family grows from the law book by itself: every law with a distance in and a force or field out is a spacing law, with the separation at a fraction of the near value', () => {
    const found = discoverSpacing();
    expect(found.length).toBeGreaterThanOrEqual(1);
    const coulomb = found.find((s) => s.law === 'coulomb.law');
    expect(coulomb).toBeDefined();
    // an inverse-square force falls to 1% at ten times the distance
    const near = 0.01;
    const d = coulomb!.at(0.01, near)!;
    expect(d / near).toBeCloseTo(10, 2);
    for (const s of found) expect(s.id.startsWith('spacing.')).toBe(true);
    console.log(`spacing laws discovered from the book: ${found.map((s) => s.law).join(', ')}`);
  });
});

describe('construction laws in Nex, in the substrate, by hash', () => {
  it('every construction law is a Nex structure with a hash and a rendering; the person law\'s sizes are terms over the person\'s measures that evaluate to the derived defaults', () => {
    const hashes = new Set(CONSTRUCTION_LAWS.map(constructionHash));
    expect(hashes.size).toBe(CONSTRUCTION_LAWS.length);
    for (const l of CONSTRUCTION_LAWS) expect(text(l.structure).length, l.id).toBeGreaterThan(0);
    const person = CONSTRUCTION_LAWS.find((l) => l.id === 'scale.person')!;
    const env = Object.fromEntries(Object.entries(PERSON).map(([k, m]) => [`person:${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, m.value]));
    const terms = (person.structure as unknown as { args: { args: [{ id: string }, unknown] }[] }).args;
    const seat = terms.find((t) => t.args[0].id === 'seat-height')!;
    expect(round5(evalTerm(seat.args[1] as never, env))).toBe(defaultOf(subject({ forPerson: true }), 'seat height'));
    const work = terms.find((t) => t.args[0].id === 'work-surface-height')!;
    expect(round5(evalTerm(work.args[1] as never, env))).toBe(defaultOf(subject({ forPerson: true }), 'work surface height'));
  });

  it('the substrate holds the family: each law under its family, over the book laws it rests on, the spacing laws read from the book, the person\'s measures with their sources', () => {
    const s = substrate();
    expect(s.has('construction.mechanical.end-fixity')).toBe(true);
    expect(s.outOf('construction.mechanical.end-fixity', 'is-a').map((x) => x.to)).toContain('construction.mechanical-family');
    expect(s.outOf('construction.mechanical.end-fixity', 'governed-by').map((x) => x.to)).toContain('buckling.euler');
    expect(s.outOf('construction.spacing.coulomb.law', 'requires').map((x) => x.to)).toContain('coulomb.law');
    expect(s.has('person.popliteal-height')).toBe(true);
    expect(s.get('person.popliteal-height')!.source).toMatchObject({ kind: 'handbook' });
    const disc = constructionDiscovery();
    expect(disc.entities.filter((x) => x.domains.includes('construction') && x.kinds.includes('law')).length).toBeGreaterThan(CONSTRUCTION_LAWS.length);
  });

  it('a correction reaches the construction laws by hash alone: a corrected Euler buckling law marks the end-fixity law stale, and nothing else of the family', () => {
    const cits = citations();
    expect(cits.some((c) => c.kind === 'construction')).toBe(true);
    const out = lawChanged('buckling.euler', { term: r('state', [TERMS['buckling.euler'] ?? d('buckling.euler'), d('corrected')], {}) });
    const ids = out.stale.map((c) => c.id);
    expect(ids).toContain('construction.mechanical.end-fixity');
    expect(ids).not.toContain('construction.scale.person');
  });
});

describe('mechanical.overturning, as the stand and the foresight read it', () => {
  const sim = { ...newDoc().sim, airDrag: false };
  const g = Math.hypot(...sim.gravity);
  it("a shelf unit as designed (reach height, a shelf's depth for a base) tips under the person's push from the front; a table, wide and low, does not", () => {
    const shelf = buildTest({ spec: { what: 'shelf' }, changes: [], factor: 1 }, sim);
    const push = shelf.setup.pushes![0]!;
    expect(push.force).toEqual([0, 0, -PUSH]);
    const tip = overturning(shelf.frag, shelf.setup.loads, push, g);
    expect(tip.base).toBeCloseTo(DEFAULTS.shelf.depth, 2);
    expect(tip.height).toBeGreaterThan(DEFAULTS.shelf.height - 0.02);
    expect(tip.ratio).toBeGreaterThan(1);
    // the number is the law's: F h = ratio · W b/2 with the weight the unit's and its loads'
    expect(tip.ratio * tip.takes).toBeCloseTo(PUSH, 6);
    expect(tip.takes).toBeCloseTo((tip.weight * tip.base / 2) / tip.height, 6);
    const table = buildTest({ spec: { what: 'table' }, changes: [], factor: 1 }, sim);
    const t = overturning(table.frag, table.setup.loads, table.setup.pushes![0]!, g);
    expect(t.base).toBeCloseTo(DEFAULTS.table.depth, 2);
    expect(t.ratio).toBeLessThan(1);
  });
});

describe('assemblies', () => {
  const sim = { ...newDoc().sim, airDrag: false };
  const frame: Assembly = {
    members: [
      { name: 'a', kind: 'lumber', params: 'size=2x2', material: 'wood.douglas-fir', role: 'support' },
      { name: 'b', kind: 'lumber', params: 'size=2x2', material: 'wood.douglas-fir', role: 'support' },
      { name: 'top', kind: 'plate', params: 'length=1.1 width=0.3 thickness=0.018', material: 'wood.douglas-fir', role: 'carries' },
      { name: 'rail', kind: 'lumber', params: 'size=1x4', material: 'wood.douglas-fir', role: 'spans' },
    ],
    relations: [
      { how: 'join', a: 'rail', b: 'a' },
      { how: 'between', member: 'rail', a: 'a', b: 'b', under: 'top', rot: 'rot x 90' },
      { how: 'on', member: 'top', onto: ['a', 'b'] },
      { how: 'stands', member: 'b', at: [0.5, 0], top: 0.7 },
      { how: 'stands', member: 'a', at: [-0.5, 0], top: 0.7 },
      { how: 'join', a: 'top', b: 'a' },
    ],
  };

  it('relations resolve in dependency order whatever order they were said: supports, then what rests on them, then what spans, joints after both parts; a cycle is refused by name', () => {
    const seq = order(frame).map((r) => (r.how === 'join' ? `join ${r.a} ${r.b}` : `${r.member}:${r.how}`));
    expect(seq.indexOf('a:stands')).toBeLessThan(seq.indexOf('top:on'));
    expect(seq.indexOf('b:stands')).toBeLessThan(seq.indexOf('top:on'));
    expect(seq.indexOf('top:on')).toBeLessThan(seq.indexOf('rail:between'));
    expect(seq.indexOf('rail:between')).toBeLessThan(seq.indexOf('join rail a'));
    expect(() => order({ members: frame.members, relations: [{ how: 'on', member: 'a', onto: ['b'] }, { how: 'on', member: 'b', onto: ['a'] }] })).toThrow(/wait on each other/);
  });

  it('on uneven ground every support reaches its own ground and the tops are level above the highest point; the Forge builds on the bench with its joints where parts touch', () => {
    const ground = (x: number) => (x < 0 ? 0 : 0.1);
    const forge = toForge(frame, { groundAt: ground });
    const lengths = [...forge.matchAll(/length=([\d.]+) at ([-\d.]+) ([\d.]+)/g)].map((m) => ({ L: Number(m[1]), x: Number(m[2]), y: Number(m[3]) }));
    const a = lengths.find((l) => l.x < 0)!, b = lengths.find((l) => l.x > 0)!;
    expect(a.L).toBeCloseTo(0.8, 6); // from ground 0 up to the plane (0.1) + 0.7
    expect(b.L).toBeCloseTo(0.7, 6);
    expect(a.y + a.L / 2).toBeCloseTo(b.y + b.L / 2, 6); // level tops
    const bench = new Bench(sim);
    const r = run(toForge(frame), new BuildHost(bench));
    expect(r.ok, r.error).toBe(true);
    expect(Object.values(bench.doc.connections)).toHaveLength(2);
    expect(rolesOf(frame)).toEqual({ a: 'support', b: 'support', top: 'carries', rail: 'spans' });
  });

  it('every design, the five written as coordinates and the six as assemblies, carries a role for every member', () => {
    for (const what of ['table', 'bench', 'crate', 'shelf', 'wall', 'tower', 'bridge', 'frame', 'stand', 'ramp', 'ladder', 'chair'] as const) {
      const plan = design({ what }, 0, 2, 't-');
      const names = [...plan.forge.matchAll(/ as (\S+)$/gm)].map((m) => m[1]!);
      expect(names.length, what).toBe(plan.parts);
      for (const n of names) expect(plan.roles[n], `${what} ${n}`).toBeDefined();
    }
  });
});

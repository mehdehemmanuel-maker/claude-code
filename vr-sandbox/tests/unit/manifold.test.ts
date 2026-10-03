// The engineering language of manifolds: a contract is answered by its numbers through every lawful mechanism, never
// by a name; every arrow is an action; a human name is never a root; an instance is a sentence in the constructor's
// language. docs/MANIFOLD-LANGUAGE.md.
import { describe, expect, it } from 'vitest';
import { ActionRefused, Construction, DEFAULT_ENV, DOMAINS, LEVELS, MANIFOLDS, descendantsOf, engineer, engineeredReport, instantiate, lineage, manifoldById, manifoldByName, transformations, waitsOn } from '../../src/ganglia/manifold';
import { lawById } from '../../src/ganglia/laws';
import { getBattery } from '../../src/data/batteries';
import { DocStore } from '../../src/doc/store';
import { newDoc } from '../../src/doc/commands';
import { interpret } from '../../src/assistant/intent';

const C0 = 273.15, WH = 3600;

describe('the engineering language', () => {
  it('no human name is a root: every named manifold is a refinement of a behaviour, and its lineage passes every level in order', () => {
    for (const m of MANIFOLDS) {
      if (m.names?.length) expect(m.parent, m.id).not.toBeNull();
      const line = lineage(m.id);
      expect(line[0]!.level, m.id).toBe('behavior');
      const levels = line.map((x) => LEVELS.indexOf(x.level));
      for (let i = 1; i < levels.length; i++) expect(levels[i]!, `${m.id}: ${line.map((x) => x.level).join(' > ')}`).toBeGreaterThan(levels[i - 1]!);
    }
    expect(manifoldByName('battery')!.id).toBe('cell.reversible');
    expect(lineage('cell.nimh').map((x) => x.id)).toEqual(['behavior.store', 'store.energy', 'store.energy.electrochemical', 'cell.reversible', 'cell.nimh']);
    // the behaviour "store" has seven mechanisms under it, and a battery is one leaf of one of them
    const mechanisms = descendantsOf('store.energy').filter((m) => m.level === 'mechanism').map((m) => m.mechanism);
    expect(new Set(mechanisms)).toEqual(new Set(['electrochemical', 'electrostatic', 'inertial', 'elastic', 'pneumatic', 'gravitational', 'thermal', 'chemical']));
  });

  it('every manifold cites a law that exists, has ports in a domain of the language, and every number names its source or that it is an estimate', () => {
    for (const m of MANIFOLDS) {
      expect(m.laws.length, m.id).toBeGreaterThan(0);
      for (const l of m.laws) expect(lawById(l), `${m.id} cites ${l}`).toBeTruthy();
      for (const port of m.ports) expect(DOMAINS.includes(port.domain), `${m.id}.${port.name}`).toBe(true);
      for (const p of m.parameters) {
        expect(p.high, `${m.id}.${p.sym}`).toBeGreaterThanOrEqual(p.low);
        expect('cite' in p.of || ('estimate' in p.of && p.of.estimate.length > 3), `${m.id}.${p.sym} has no provenance`).toBe(true);
      }
      expect(m.source.cite.length).toBeGreaterThan(10);
    }
  });

  it('every arrow is an action and the trace has no gaps', () => {
    const c = new Construction();
    c.select('behavior.store').refine('store.energy').specialize('cell.nimh');
    expect(c.steps.map((s) => s.verb)).toEqual(['SELECT', 'REFINE', 'REFINE', 'REFINE', 'REFINE']);
    for (let i = 1; i < c.steps.length; i++) expect(c.steps[i]!.from).toBe(c.steps[i - 1]!.to);
    const r = engineer({ stores: 100e3, releases: 500, massMax: 5, rechargeable: true });
    for (const k of r.candidates) {
      // a chain: selection, refinement down to the store, compositions, parameterisations, connections, constraints
      expect(k.steps[0]!.verb).toBe('SELECT');
      expect(k.steps.some((s) => s.verb === 'PARAMETERIZE' && s.from === k.store.id)).toBe(true);
      expect(k.steps.some((s) => s.verb === 'SATISFY' && s.to === 'mass')).toBe(true);
      const refine = k.steps.filter((s) => s.verb === 'REFINE');
      for (let i = 1; i < refine.length; i++) expect(refine[i]!.from).toBe(refine[i - 1]!.to);
      expect(refine.at(-1)!.to).toBe(k.store.id);
    }
  });

  it('an unlawful action is refused: refining across the tree, composing a converter of the wrong domain, connecting ports of different domains or substances', () => {
    const c = new Construction();
    expect(() => c.refine('store.energy')).toThrow(ActionRefused);
    c.select('behavior.store');
    expect(() => c.refine('cell.nimh')).toThrow(/not a refinement/);
    c.refine('store.energy').specialize('cell.nimh');
    const machine = manifoldById('convert.electrical.rotational')!, heater = manifoldById('convert.electrical.thermal')!;
    expect(() => c.compose('thermal', 'contract', machine, true)).toThrow(/takes electrical; the chain stands in thermal/);
    expect(() => c.compose('thermal', 'contract', heater, false)).toThrow(/runs one way/);
    expect(c.compose('electrical', 'contract', machine, true)).toBe('rotational');
    const fly = manifoldById('flywheel.disc')!, nimh = manifoldById('cell.nimh')!;
    expect(() => c.connect({ manifold: nimh, port: 'energy_out' }, { manifold: fly, port: 'energy_in' })).toThrow(/a domain crosses only by a transformation/);
    const lyser = manifoldById('convert.electrical.chemical')!, petrol = manifoldById('fuel.hydrocarbon')!;
    expect(() => c.connect({ manifold: lyser, port: 'gas' }, { manifold: petrol, port: 'energy_in' })).toThrow(/not the same substance/);
    expect(() => c.satisfy({ id: 'x', says: 'x', holds: () => 'never' })).toThrow(ActionRefused);
  });

  it('the final test: 100 kJ, 500 W, -10 to 40 °C, under 5 kg, rechargeable is answered through every mechanism, by the numbers, and a battery emerges without being asked for', () => {
    const r = engineer({ stores: 100e3, releases: 500, window: [C0 - 10, C0 + 40], massMax: 5, rechargeable: true });
    const tried = [...r.candidates.map((k) => k.store), ...r.refused.map((x) => x.store)];
    expect(new Set(tried.map((m) => m.mechanism))).toEqual(new Set(['electrochemical', 'electrostatic', 'inertial', 'elastic', 'pneumatic', 'gravitational', 'thermal', 'chemical']));
    // what cannot be refilled in place is refused at that constraint, before any sizing
    const petrol = r.refused.find((x) => x.store.id === 'fuel.hydrocarbon')!;
    expect(petrol.step.verb).toBe('SATISFY');
    expect(petrol.step.why).toMatch(/spent once/);
    expect(r.refused.find((x) => x.store.id === 'cell.primary')!.step.why).toMatch(/spent once/);
    // what cannot work across the window is refused there
    const li = r.refused.find((x) => x.store.id === 'cell.li-ion')!;
    expect(li.step.why).toMatch(/works only from 0 to 45 °C/);
    // the lightest certain way is a stocked NiMH pack, sized by its datasheet: enough cells that 500 W leaves the
    // terminals at 80 % of open-circuit volts, and enough that 100 kJ / 0.7 is held at that rate
    const ch = r.chosen!;
    expect(ch.store.id).toBe('cell.nimh');
    expect(ch.certain).toBe(true);
    expect(ch.member.realization).toMatch(/^battery\.nimh\./);
    const cell = getBattery(ch.member.realization!);
    expect(ch.mass[0]).toBeCloseTo(ch.member.parameters['blocks']! * cell.mass, 9);
    expect(ch.member.parameters['blocks']! * (0.16 * cell.V * cell.V) / cell.internalR).toBeGreaterThanOrEqual(500);
    expect(ch.member.parameters['Wh']! * WH).toBeGreaterThanOrEqual(100e3 / 0.7 - 1);
    expect(ch.mass[1]).toBeLessThan(2);
    // lead-acid is lawful by chemistry but over the mass; the flywheel needs a 500 W machine none stocked here gives,
    // so it is lawful only within its family's range: not certain, not placeable
    expect(r.refused.find((x) => x.store.id === 'cell.lead-acid')!.step.constraint).toBe('mass');
    const fly = r.candidates.find((k) => k.store.id === 'flywheel.disc')!;
    expect(fly.certain).toBe(false);
    expect(fly.instantiable).toBe(false);
    expect(fly.converters[0]!.member.realization).toBeUndefined();
    // what remains lawful but unstocked says so
    const edlc = r.candidates.find((k) => k.store.id === 'capacitor.edlc');
    if (edlc) expect(edlc.instantiable).toBe(false);
    const said = engineeredReport(r);
    expect(said).toMatch(/began at the behaviour "store"/);
    expect(said).toMatch(/nickel-metal hydride cell/);
    expect(said.indexOf('what people call a NiMH battery')).toBeGreaterThan(said.indexOf('electrochemical, nickel-metal hydride cell'));
  });

  it('the same want with more power or a wider window is answered differently: the numbers choose, not the name', () => {
    // 20 kJ at 20 kW: no stocked cell gives it under 5 kg; a double-layer capacitor can, within its family's range
    const burst = engineer({ stores: 20e3, releases: 20e3, massMax: 5, rechargeable: true });
    expect(burst.refused.find((x) => x.store.id === 'cell.nimh')!.step.constraint).toBe('mass');
    expect(burst.candidates.map((k) => k.store.id)).toContain('capacitor.edlc');
    expect(burst.chosen!.store.mechanism).not.toBe('electrochemical');
    // -50 to 60 °C: every chemistry stocked is out; a capacitor or a rotor remains
    const cold = engineer({ stores: 10e3, releases: 100, window: [C0 - 40, C0 + 60], rechargeable: true });
    expect(cold.refused.filter((x) => x.store.mechanism === 'electrochemical' && x.store.reversible).every((x) => /works only from/.test(x.step.why))).toBe(true);
    expect(cold.candidates.some((k) => k.store.id === 'capacitor.edlc' || k.store.id === 'flywheel.disc')).toBe(true);
    // not rechargeable: petrol is admitted and, by its 12 kWh/kg, is the lightest of all
    const once = engineer({ stores: 10e6, releases: 1000 });
    expect(once.chosen!.store.id).toBe('fuel.hydrocarbon');
    // heat wanted out: the thermal store needs no engine, and a heater brings electricity in
    const warm = engineer({ stores: 1e6, releases: 500, out: 'thermal', rechargeable: true });
    const res = warm.candidates.find((k) => k.store.id === 'reservoir.sensible')!;
    expect(res.converters.map((x) => x.manifold.id)).toEqual(['convert.electrical.thermal']);
  });

  it('a flywheel is sized by its laws: at a stocked machine\'s speed a rotor of the room\'s radius is heavy; without that cap its mass is set by its strength', () => {
    const fast = engineer({ stores: 100e3, releases: 100, rechargeable: true }, { ...DEFAULT_ENV });
    const fly = fast.candidates.find((k) => k.store.id === 'flywheel.disc')!;
    expect(fly.member.parameters['limitedBy']).toBe(1);
    expect(fly.member.parameters['stress']!).toBeLessThan(fly.member.parameters['rpm']! > 0 ? 400e6 : 0);
    const machine = fly.converters[0]!;
    expect(machine.manifold.id).toBe('convert.electrical.rotational');
    expect(machine.role).toBe('both');
    expect(fly.member.parameters['rpm']!).toBeLessThanOrEqual((machine.member.parameters['speedMax']! * 60) / (2 * Math.PI) + 1e-6);
    // E = 1/4 m r^2 w^2 holds for the member, sized to give 100 kJ out through the machine at its least efficiency
    const { E, rotorMass, radius, omega } = fly.member.parameters as Record<string, number>;
    expect(E).toBeCloseTo(100e3 / machine.manifold.parameters.find((x) => x.sym === 'eff')!.low, 6);
    expect(0.25 * rotorMass! * radius! * radius! * omega! * omega!).toBeCloseTo(E!, 3);
  });

  it('the lightest placeable electrochemical member is placed through the language, as one construction, and a rotor on a machine too', () => {
    const r = engineer({ stores: 20e3, releases: 50, rechargeable: true });
    // lighter unstocked families rank first by their numbers and say so; the first placeable one is a stocked pack
    expect(r.chosen!.instantiable).toBe(false);
    const pick = r.candidates.find((k) => k.instantiable)!;
    expect(pick.store.id).toBe('cell.nimh');
    const store = new DocStore(newDoc('m'));
    const out = instantiate(pick, store, [0, 0, 0], [0, 0, 0, 1], 's');
    expect('parts' in out && out.parts.length).toBe(pick.member.parameters['packs']);
    const pack = store.doc.parts[(out as { parts: string[] }).parts[0]!]!;
    expect(pack.kind).toBe('battery');
    expect(pack.params['model']).toBe(pick.member.realization);
    expect(Number(pack.params['series']) * Number(pack.params['parallel']) * pick.member.parameters['packs']!).toBe(pick.member.parameters['blocks']);
    // a realisation lies in its part kind's own parameter manifold: no pack asks for more than its template allows
    expect(Number(pack.params['series'])).toBeLessThanOrEqual(8);
    expect(Number(pack.params['parallel'])).toBeLessThanOrEqual(4);
    const fly = r.candidates.find((k) => k.store.id === 'flywheel.disc')!;
    expect(fly.instantiable).toBe(true);
    const store2 = new DocStore(newDoc('m'));
    const out2 = instantiate(fly, store2, [1, 0, 0], [0, 0, 0, 1], 'f');
    expect('parts' in out2 && out2.parts.length).toBe(2);
    expect(Object.values(store2.doc.connections).map((c) => c.kind)).toEqual(['motor']);
    expect(Object.values(store2.doc.parts).map((p) => p.kind).sort()).toEqual(['disc', 'motor.dc']);
  });

  it('what is not stocked is constructible, not placeable, and says what it waits on', () => {
    const r = engineer({ stores: 20e3, releases: 20e3, massMax: 5, rechargeable: true });
    const edlc = r.candidates.find((k) => k.store.id === 'capacitor.edlc')!;
    expect(waitsOn(edlc)).toMatch(/part kind for electrochemical double-layer capacitor/);
    const out = instantiate(edlc, new DocStore(newDoc('m')), [0, 0, 0], [0, 0, 0, 1], 'c');
    expect('refused' in out && out.refused).toMatch(/constructible, not placeable here/);
  });

  it('transformations bridge domains both ways only when reversible', () => {
    expect(transformations('electrical', 'rotational').map((t) => [t.manifold.id, t.forward])).toEqual([['convert.electrical.rotational', true]]);
    expect(transformations('rotational', 'electrical').map((t) => [t.manifold.id, t.forward])).toEqual([['convert.electrical.rotational', false]]);
    expect(transformations('thermal', 'electrical').map((t) => t.manifold.id)).toEqual(['convert.thermal.electrical']);
    expect(transformations('electrical', 'thermal').map((t) => t.manifold.id)).toEqual(['convert.electrical.thermal']);
  });

  it('the contract is read from words with their units', () => {
    const i = interpret('I need a system that stores 100 kJ, releases 500 W, works between -10 degC and 40 degC, weighs under 5 kg and must be rechargeable');
    expect(i?.do).toBe('contract');
    if (!i || i.do !== 'contract') return;
    expect(i.contract.stores).toBeCloseTo(100e3, 6);
    expect(i.contract.releases).toBe(500);
    expect(i.contract.massMax).toBe(5);
    expect(i.contract.window![0]).toBeCloseTo(C0 - 10, 6);
    expect(i.contract.window![1]).toBeCloseTo(C0 + 40, 6);
    expect(i.contract.rechargeable).toBe(true);
    expect(interpret('build it')?.do).toBe('realize');
    const short = interpret('store 50 Wh and give 100 W');
    expect(short?.do).toBe('contract');
    if (short?.do === 'contract') expect(short.contract.stores).toBe(50 * WH);
  });
});

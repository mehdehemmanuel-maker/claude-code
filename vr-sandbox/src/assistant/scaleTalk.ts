// Ego on scale: what changes when a thing is made larger or smaller, whether a law knows the size, what an observer
// gets of a process, what is structurally the same many decades away, whether reality is the same at every scale,
// where a description holds, how long a signal takes. Every number is derived in ganglia/scale from the law book, the
// dimensions and what the regime holds; the hypothesis is reported as a hypothesis.
import type { Intent } from './intent';
import { LAWS, lawById } from '../ganglia/laws';
import { TICK } from '../physics/world';
import { substrate, type SubstrateEntity } from '../ganglia';
import { SIMILARITIES, similarityById, scaleSystem, GROUPS, groupUnder, classify, scaleSetters, OBSERVERS, observerById, project, MECHANISMS, propagation, CROSS_SCALES, universalScaleStructuralEquivalence, findScaleAnalogues, characteristicLength, characteristicTime, redesign, scaleLimits, type ScaleTransform } from '../ganglia/scale';
import { engineeredReport, type Engineered } from '../ganglia/manifold';

type Scale = Extract<Intent, { do: 'scaling' }>;

const PREFIX = /^(bio|material|process|machine|chem|phys|element|circuit|robot|vehicle|earth|energy|cross|group|scale|observer|std|failure|role|fn|param|view|tool|block|kind|way|flow|domain) /;
const nameOf = (e: SubstrateEntity) => (e.names.find((n) => !PREFIX.test(n) && n !== e.name) ?? e.name).replace(PREFIX, '');
const k = (x: number) => (Math.abs(x) >= 1000 || Math.abs(x) < 0.001 ? x.toExponential(2) : +x.toPrecision(3)).toString();

/** A law by its words: id, name, or the words of its name. */
function findLaw(words: string) {
  const norm = (x: string) => x.toLowerCase().replace(/[’']/g, '').replace(/\s+law$/, '').replace(/\s+/g, ' ').trim();
  const w = norm(words);
  return lawById(w) ?? LAWS.find((l) => norm(l.name) === w) ?? LAWS.find((l) => l.id.replace(/[.-]/g, ' ') === w) ?? LAWS.find((l) => norm(l.name).startsWith(w) || norm(l.name).includes(w)) ?? LAWS.find((l) => w.split(' ').every((x) => norm(l.name).includes(x) || l.id.includes(x))) ?? LAWS.find((l) => l.tags.includes(w));
}

/** A thing of the substrate by its words, preferring one that carries a characteristic scale. */
function findThing(words: string): SubstrateEntity | undefined {
  const s = substrate();
  const w = words.toLowerCase().trim();
  const aliases: Record<string, string> = { heartbeat: 'bio.heart', 'heart beat': 'bio.heart', wingbeat: 'bio.insect-wing-hinge', 'wing beat': 'bio.insect-wing-hinge', stride: 'bio.human', step: 'bio.human', 'atp synthase': 'bio.atp-synthase', 'flagellar motor': 'bio.bacterial-flagellar-motor', kart: 'vehicle.car', car: 'vehicle.car', motor: 'motor.electric', 'electric motor': 'motor.electric', heart: 'bio.heart', cell: 'bio.cell', neuron: 'bio.neuron', atom: 'chem.atom', proton: 'phys.proton', bearing: 'bearing', pump: 'pump.centrifugal', turbine: 'turbine', 'the earth': 'earth', earth: 'earth', climate: 'earth.climate', weather: 'earth.weather', river: 'earth.river', ocean: 'earth.ocean', tide: 'earth.tide', homeostasis: 'bio.homeostasis', transistor: 'transistor', cpu: 'cpu', chip: 'ic', drone: 'vehicle.drone', ship: 'vehicle.ship', aircraft: 'vehicle.aircraft', plane: 'vehicle.aircraft', lathe: 'machine.lathe', spring: 'spring.helical', flywheel: 'flywheel.disc', servo: 'servo', gear: 'gear.spur', frame: 'frame', muscle: 'bio.skeletal-muscle', virus: 'bio.virus', bacterium: 'bio.bacteria', bacteria: 'bio.bacteria', ribosome: 'bio.ribosome', protein: 'bio.protein', molecule: 'chem.molecule', human: 'bio.human', person: 'bio.human', me: 'bio.human' };
  const id = aliases[w];
  if (id && s.get(id)) return s.get(id);
  return s.get(w) ?? s.byWord(w) ?? s.get(w.replace(/\s+/g, '.')) ?? s.get(`bio.${w.replace(/\s+/g, '-')}`) ?? s.get(`vehicle.${w}`) ?? s.get(`earth.${w}`);
}

function findObserver(words: string) {
  const w = words.toLowerCase().trim();
  const map: Record<string, string> = { human: 'observer.human', person: 'observer.human', me: 'observer.human', you: 'observer.human', i: 'observer.human', eye: 'observer.human', someone: 'observer.human', hand: 'observer.human-hand', finger: 'observer.human-hand', fly: 'observer.fly', insect: 'observer.fly', bat: 'observer.bat', neuron: 'observer.neuron', headset: 'observer.headset', display: 'observer.headset', screen: 'observer.headset', 'physics step': 'observer.physics-step', physics: 'observer.physics-step', engine: 'observer.physics-step', simulation: 'observer.physics-step', simulator: 'observer.physics-step', solver: 'observer.physics-step' };
  return observerById(map[w] ?? `observer.${w.replace(/\s+/g, '-')}`) ?? OBSERVERS.find((o) => o.name.includes(w));
}

function findCarrier(words: string | undefined) {
  const w = (words ?? '').toLowerCase();
  const pick = /wire|cable|copper|electr/.test(w) ? 'carry.wire' : /air|sound|voice|shout/.test(w) ? 'carry.sound-air' : /water|sea|pool/.test(w) ? 'carry.sound-water' : /nerve|neuron|axon/.test(w) ? 'carry.nerve-myelinated' : /diffus|smell|scent/.test(w) ? 'carry.diffusion-air' : /light|laser|radio/.test(w) ? 'carry.light' : 'carry.sound-steel';
  return MECHANISMS.find((m) => m.id === pick)!;
}

const DEFAULT: ScaleTransform = similarityById('scale.froude')!;

/** The last want, engineered again λ times larger or smaller: same material, same planet (Froude) unless another similarity is named. */
export function answerRedesign(i: Scale, last: Engineered | null): { says: string; result: Engineered | null } {
  if (!last) return { says: 'Nothing is engineered yet: tell me what to store, give out, work between and weigh under, then ask for it at another size.', result: null };
  const lambda = i.factor ?? 0.1;
  const t = (i.similarity && similarityById(i.similarity)) || DEFAULT;
  const r = redesign(last, t, lambda);
  return { says: `${r.says} ${engineeredReport(r.after)}`, result: r.after };
}

/** Where the last design stops being the same design: the laws of its chosen member and converters swept over λ. */
export function answerLimit(i: Scale, last: Engineered | null): string {
  if (!last) return 'Nothing is engineered yet: give me a want first, then ask how far it scales.';
  const c = last.chosen ?? last.candidates[0];
  if (!c) return 'The last want had no member that met it, so there is no design to scale.';
  const t = (i.similarity && similarityById(i.similarity)) || DEFAULT;
  const laws = [...new Set([...c.store.laws, ...c.converters.flatMap((x) => x.manifold.laws)])].filter((id) => lawById(id));
  if (!laws.length) return `${c.store.name} cites no executable law to sweep.`;
  const limits = scaleLimits(laws, t);
  const downs = limits.filter((l) => l.down).sort((a, b) => b.down!.lambda - a.down!.lambda);
  const ups = limits.filter((l) => l.up).sort((a, b) => a.up!.lambda - b.up!.lambda);
  const always = limits.filter((l) => l.always);
  const fine = limits.filter((l) => !l.down && !l.up && !l.always);
  const f = (x: number) => (x >= 1000 || x < 0.01 ? x.toExponential(1) : +x.toPrecision(2)).toString();
  return `${c.store.name}${c.converters.length ? ` with ${c.converters.map((x) => x.manifold.name).join(' and ')}` : ''}, under ${t.name}: ${downs.length ? `made smaller, ${downs[0]!.law} leaves its regime first, at λ = ${f(downs[0]!.down!.lambda)} (${downs[0]!.down!.why})` : 'made smaller to a thousandth, no law leaves its regime'}; ${ups.length ? `made bigger, ${ups[0]!.law} leaves first, at λ = ${f(ups[0]!.up!.lambda)} (${ups[0]!.up!.why})` : 'made bigger to a thousand times, none does'}. ${always.length ? `Laws that do not follow the size at any λ: ${always.map((l) => `${l.law} (${l.always!.why})`).join('; ')}. ` : ''}${fine.length ? `Covariant throughout: ${fine.map((l) => l.law).join(', ')}.` : ''} Between those limits it is the same design, only sized.`;
}

export function answerScale(i: Scale): string {
  if (i.query === 'redesign') return answerRedesign(i, null).says;
  if (i.query === 'limit') return answerLimit(i, null);
  if (i.query === 'transform') {
    const lambda = i.factor ?? 10;
    const t = (i.similarity && similarityById(i.similarity)) || DEFAULT;
    const sys = scaleSystem(t, [
      { sym: 'L', name: 'length', unit: 'm', value: 1 }, { sym: 'A', name: 'area', unit: 'm^2', value: 1 }, { sym: 'm', name: 'mass', unit: 'kg', value: 1 }, { sym: 'T', name: 'time', unit: 's', value: 1 }, { sym: 'v', name: 'speed', unit: 'm/s', value: 1 },
      { sym: 'f', name: 'frequency', unit: 'Hz', value: 1 }, { sym: 'F', name: 'force', unit: 'N', value: 1 }, { sym: 'sigma', name: 'stress', unit: 'Pa', value: 1 }, { sym: 'E', name: 'energy', unit: 'J', value: 1 }, { sym: 'P', name: 'power', unit: 'W', value: 1 },
    ], lambda);
    const line = sys.map((q) => `${q.name} ×${k(q.scaled)}`).join(', ');
    const stress = sys.find((q) => q.sym === 'sigma')!.scaled, force = sys.find((q) => q.sym === 'F')!.scaled, area = sys.find((q) => q.sym === 'A')!.scaled;
    const cube = lambda > 1 ? `stress grows ×${k(stress)} while strength grows with area ×${k(area)}: the square-cube law, it is nearer to breaking` : `stress falls ×${k(stress)} against area ×${k(area)}: the square-cube law the other way, relatively ${k(1 / stress)} times stronger, which is why an ant carries fifty times its weight`;
    const groups = ['Re', 'Fr', 'Bo', 'Bi', 'He'].map((id) => groupUnder(GROUPS.find((g) => g.id === id)!, t)).map((v) => `${v.group.id} ×${k(Math.pow(lambda, v.exponent))}${v.invariant ? ' (preserved)' : ''}`).join(', ');
    const re = groupUnder(GROUPS.find((g) => g.id === 'Re')!, t);
    const flow = Math.pow(lambda, re.exponent) < 1 ? 'flow around it goes toward viscous, surface tension matters below the capillary length (2.7 mm in water), cooling by its surface is faster' : 'flow around it goes toward turbulent, surface tension stops mattering, it cools slower by its surface';
    let laws = '';
    if (i.of) {
      const e = findThing(i.of);
      if (e) {
        const ids = substrate().reach(e.id, 'governed-by').map((x) => x.id).filter((id) => lawById(id));
        if (ids.length) {
          const rows = ids.map((id) => classify(id, t, lambda));
          const ok = rows.filter((r) => r.verdict === 'covariant' || r.verdict === 'invariant'), bad = rows.filter((r) => !ok.includes(r));
          laws = ` For ${nameOf(e)}, ${ok.length} of its ${rows.length} laws keep their form (${ok.map((r) => r.law).join(', ')})${bad.length ? `; ${bad.map((r) => `${r.law} is ${r.verdict}: ${r.why}`).join('; ')}` : ''}.`;
        } else laws = ` I know no executable law governing ${nameOf(e)} to test.`;
      }
    }
    return `${lambda > 1 ? `${k(lambda)} times bigger` : `${k(1 / lambda)} times smaller`}, same material and same planet (${t.name}; ${t.derivation}): ${line}. ${cube}. The groups: ${groups}; ${flow}.${laws} Force ×${k(force)}: a motor for it must give that.`;
  }
  if (i.query === 'law') {
    const law = findLaw(i.of ?? '');
    if (!law) return `I know no law called ${i.of}.`;
    const rows = SIMILARITIES.filter((t) => t.holds.includes('material')).map((t) => classify(law, t, 10));
    const anyConst = rows.flatMap((r) => r.setsScale).map((c) => c.sym).filter((x, j, a) => a.indexOf(x) === j);
    return `${law.name} (${law.formula}): ${rows.map((r) => `${r.verdict} under ${similarityById(r.transform)!.name}`).join('; ')}. ${rows.find((r) => r.verdict === 'scale-dependent')?.why ?? rows[0]!.why}.${anyConst.length ? ` The constant${anyConst.length > 1 ? 's' : ''} ${anyConst.join(', ')} set${anyConst.length > 1 ? '' : 's'} the scale it knows.` : ' No constant inside it knows the size.'} Derived from its own worked example at λ = 10.`;
  }
  if (i.query === 'observe') {
    const o = findObserver(i.observer ?? 'human');
    if (!o) return `I know no observer called ${i.observer}.`;
    const e = findThing(i.of ?? '');
    const L = e && characteristicLength(e), T = e && characteristicTime(e);
    if (!e || L === undefined || T === undefined) return `I know no characteristic length and time for ${i.of}: I cannot project it yet.`;
    const p = project({ name: nameOf(e), length: L, time: T }, o);
    const others = OBSERVERS.filter((x) => x.id !== o.id).map((x) => project({ name: nameOf(e), length: L, time: T }, x)).filter((x) => x.temporal !== p.temporal).slice(0, 2);
    return `${p.says} Its time is ${k(p.ratios.timeOverResolution)} of what ${o.name} resolves and its size ${k(p.ratios.lengthOverResolution)} of what it tells apart.${others.length ? ` ${others.map((x) => `${OBSERVERS.find((y) => y.id === x.observer)!.name} gets it ${x.temporal}`).join('; ')}: the difference is in the observers, not in ${nameOf(e)}.` : ''}`;
  }
  if (i.query === 'analogues') {
    const e = findThing(i.of ?? '');
    if (!e) return `I know no ${i.of}.`;
    const r = findScaleAnalogues(substrate(), e.id, { minDecades: 2, minSimilarity: 0.15 });
    if (!r || r.length === undefined) return `${nameOf(e)} carries no characteristic length yet, so I cannot place it on the scale axis.`;
    if (!r.analogues.length) return `Nothing I know shares ${nameOf(e)}'s structure two or more decades away (${r.unplaced} things carry no scale yet).`;
    return `At ${k(r.length)} m, ${nameOf(e)} is structurally like: ${r.analogues.slice(0, 6).map((a) => `${nameOf(a.entity)} at ${k(a.length)} m (${a.why})`).join('; ')}. Similarity is by functions, transformations, roles and feedback, never by looks; ${r.unplaced} things carry no scale yet.`;
  }
  if (i.query === 'hypothesis') {
    const h = universalScaleStructuralEquivalence(10);
    return `That reality is structurally equivalent across all scales is a ${h.status} here, not a premise. For it: ${h.compatible[0]} Against it: ${h.conflicting[0]} ${h.conflicting[1]} So the strong form is falsified by the constants, and the weak form, equivalence within regimes bounded by them, is a theorem of dimensional analysis: ${h.predictions[1]} Still open: ${h.unresolved[0]}`;
  }
  if (i.query === 'regime') {
    const law = findLaw(i.of ?? '');
    if (law) {
      const setters = scaleSetters().filter((s) => s.laws.includes(law.id));
      const rows = SIMILARITIES.filter((t) => t.holds.includes('material')).map((t) => classify(law, t, 10));
      return `${law.name} holds where ${law.valid} ${setters.length ? `It carries ${setters.map((s) => `${s.sym} (${s.name})`).join(', ')}, which set${setters.length > 1 ? '' : 's'} a scale: ` : 'No constant inside it sets a scale: '}${rows.map((r) => `${r.verdict} under ${similarityById(r.transform)!.name}`).join(', ')}.`;
    }
    const c = CROSS_SCALES.find((x) => (i.of ?? '').includes(x.name.split(',')[0]!.toLowerCase()) || x.id.endsWith(i.of ?? '') || x.levels.some((l) => l.name.includes(i.of ?? '')));
    if (c) return `${c.name}: ${c.levels.map((l) => `${l.name} at ${k(l.characteristicLength)} m and ${k(l.characteristicTime)} s (${l.variables.slice(0, 3).join(', ')})`).join('; ')}. It breaks ${c.breaks.join('; ')}.`;
    const e = findThing(i.of ?? '');
    if (e) {
      const L = characteristicLength(e), T = characteristicTime(e);
      return `${nameOf(e)}${L !== undefined ? ` is described at about ${k(L)} m and ${k(T ?? 0)} s` : ' carries no characteristic scale yet'}; its laws: ${substrate().reach(e.id, 'governed-by').map((x) => x.id).slice(0, 6).join(', ') || 'none recorded'}.`;
    }
    return `I know no law or description called ${i.of}.`;
  }
  const carrier = findCarrier(i.carrier ?? i.of);
  const e = i.of ? findThing(i.of) : undefined;
  const distance = i.distance ?? (e && characteristicLength(e)) ?? 1;
  const response = (e && characteristicTime(e)) ?? TICK;
  const chain = propagation(distance, carrier, response, TICK);
  return `${chain.says} So across ${k(distance)} m it is ${chain.regime}: ${chain.regime === 'lumped' ? 'the engine may treat it as one body' : 'waves and delays matter, and a rigid body is the wrong description'}. The signal is no faster for a small thing: its distance is shorter.`;
}

// Inventing what nothing kept does by itself: an ask that turns one thing into another (waves into drinking water, a
// weight's fall into light, a flame into cold) read as a flow wanted and the flows at hand, and made as a chain of
// effects, each one a real one with what it turns into what and how much of it it keeps.
//
// The rule is the mating ports' rule (src/nexus/parts/mate.ts: a pattern of holes meets its mirror) one level down: every
// effect has a port in and a port out, and each carries a flow of one kind (power as an effort times a flow, the way
// a bond graph writes it: a force and a speed, a torque and a turning rate, a voltage and a current, a pressure and a
// volume flow, a temperature and a heat flow; or a stream of matter: seawater, humid air). An output meets an input
// of the same kind; where they are of a kind but not of a size (a weight let down turns its drum at 2 rpm, a
// generator wants thousands), what matches them is put between, as an adapter plate is between two hole patterns: a
// gear train of as many stages as the ratio needs, each stage costing its loss. Then conservation sizes it: what comes
// out is what goes in times what each stage keeps, and a matter made (fresh water) costs what its law says each kilogram
// costs at least, so what is promised is never better than the laws allow, and the floor is said beside it.
//
// Where no chain reaches what is wanted, it says which flow nothing kept makes, and which parts are not kept yet: the
// gap, not a stand-in. Each effect names the parts that make it in the inventory; those the inventory lacks are said.

import type { Board } from '../substrate/boards';
import { resolve, type Item } from '../parts/inventory';

/** A kind of flow a port carries: power in one domain, or a stream of matter. */
export type Flow = 'sunlight' | 'wind' | 'waves' | 'falling water' | 'muscle' | 'raised weight' | 'dry air' | 'push' | 'shaft' | 'electric' | 'pressure' | 'heat' | 'cold' | 'light' | 'fresh water';
/** Matter an effect works on, that must be at hand (it is not made by the chain). */
export type Matter = 'raw water' | 'humid air' | 'water';
type By = 'law' | 'sourced' | 'typical' | 'estimate';

/** What there is to start from, sized as one is usually had, and where that size comes from. */
interface Source { flow: Flow; name: string; words: RegExp; watts: number; size: string; grounds: string; by: By; /** it comes and goes (the sun sets, the wind drops): a store keeps it for when it is wanted */ intermittent?: true; /** a store let down, not a flow: charged by what it says */ charged?: string }
const RHO_SEA = 1025, G = 9.80665;
/** Deep-water wave power per metre of crest: ρ g² H² T / (64 π). */
const wavePower = (H: number, T: number) => (RHO_SEA * G * G * H * H * T) / (64 * Math.PI);
export const SOURCES: Source[] = [
  { flow: 'sunlight', name: 'the sun', words: /\b(sun|solar|sunlight|sunny|daylight|desert)\b/, watts: 1000, size: '1 m² of it at noon', grounds: '1000 W/m², the standard test irradiance (IEC 60904-3); about a quarter of that averaged over a day and night (typical)', by: 'sourced', intermittent: true },
  { flow: 'wind', name: 'the wind', words: /\b(wind|windy|breeze|gusts?)\b/, watts: 0.5 * 1.225 * 6 ** 3, size: '1 m² swept at 6 m/s', grounds: 'its kinetic flux ½ ρ A v³ (air 1.225 kg/m³)', by: 'law', intermittent: true },
  { flow: 'waves', name: 'the waves', words: /\b(waves?|ocean|sea|surf|swell|offshore|coast\w*)\b/, watts: wavePower(1.5, 8), size: '1 m of crest, waves 1.5 m high every 8 s', grounds: 'deep-water wave power ρ g² H² T / 64π', by: 'law', intermittent: true },
  { flow: 'falling water', name: 'falling water', words: /\b(river|stream|creek|waterfall|weir|dam|brook)\b/, watts: 1000 * G * 0.01 * 2, size: '10 l/s falling 2 m', grounds: 'its power ρ g Q h', by: 'law' },
  { flow: 'muscle', name: 'a person', words: /\b(hand|hands|crank\w*|pedal\w*|human|person|muscle|manual\w*|by foot|foot|walking|arm)\b/, watts: 75, size: 'working steadily for an hour', grounds: 'about 75 W from a fit adult for an hour (typical; a few hundred watts for a minute)', by: 'typical' },
  { flow: 'raised weight', name: 'a raised weight', words: /\b(gravity|weight|falling|drop\w*|descend\w*|pendulum)\b/, watts: (12 * G * 1.8) / 1200, size: '12 kg raised 1.8 m and let down over 20 minutes', grounds: 'its store m g h, 212 J, over the time it takes to come down', by: 'law', charged: 'a person lifts it' },
  { flow: 'heat', name: 'a flame', words: /\b(fire|flame|stove|burner|kerosene|paraffin|candle|wood|charcoal|waste heat|exhaust)\b/, watts: 500, size: 'a small burner', grounds: 'about 500 W of heat from a small kerosene or gas burner (estimate)', by: 'estimate' },
  { flow: 'dry air', name: 'dry air', words: /\b(desert|dry|arid|hot climate|savanna\w*)\b/, watts: (1.6 * 2.442e6) / 86400, size: 'a 50 cm clay pot drinking 1.6 l a day', grounds: 'water evaporating into dry air takes its latent heat, 2.44 MJ a kilogram: 1.6 l a day is about 45 W of cold (estimate for a pot-in-pot cooler)', by: 'estimate' },
  { flow: 'electric', name: 'a wall socket', words: /\b(plug\w*|mains|grid|outlet|socket|wall power)\b/, watts: 2000, size: 'one household socket', grounds: 'about 2 kW from one socket (230 V × 10 A, less margin: estimate)', by: 'estimate' },
];
/** Matter at hand, read from the words (air is always at hand; how humid it is, the place says). */
const MATTERS: { m: Matter; words: RegExp }[] = [
  { m: 'raw water', words: /\b(sea|ocean|seawater|salt\s?water|brine|brackish|coast\w*|waves?|dirty|muddy|pond|lake|puddle|purif\w*|contaminat\w*|unsafe)\b/ },
  { m: 'humid air', words: /\b(air|humid\w*|fog|mist|atmosphere|dew)\b/ },
  { m: 'water', words: /\b(water|tap|bucket|well)\b/ },
];

/** An effect: what it takes, what it gives, how much it keeps (or, for matter made, the energy each kilogram costs),
 *  where that comes from, and the parts that make it. Shaft ports say the speed they turn at, so two that meet can be
 *  matched. */
export interface Effect {
  id: string; name: string; from: Flow; to: Flow; needs?: Matter[];
  /** the share of power in that comes out (for cold, its coefficient of performance) */ eta?: number;
  /** for matter made: J of what comes in for each kg that comes out; and the least the laws allow */ perKg?: number; floorPerKg?: number;
  /** for light: lumens for each watt in */ lmPerW?: number;
  /** a shaft's speed where it meets another, rpm */ inRpm?: number; outRpm?: number;
  grounds: string; by: By; parts: string[]; note?: string;
}
const L_WATER = 2.442e6; // J/kg, water's latent heat of vaporisation at 25 °C (steam tables)
export const EFFECTS: Effect[] = [
  { id: 'pv', name: 'solar panel', from: 'sunlight', to: 'electric', eta: 0.2, grounds: 'a crystalline silicon module turns about 20 % of the light on it into electricity (typical, 2020s modules 20–22 %)', by: 'typical', parts: ['solar panel'] },
  { id: 'collector', name: 'solar heat collector', from: 'sunlight', to: 'heat', eta: 0.55, grounds: 'a glazed flat-plate collector keeps about half the light as heat at a modest temperature rise (typical 50–70 %)', by: 'typical', parts: ['sheet al-6061 1mm', 'tube copper 10x1'] },
  { id: 'still', name: 'solar still', from: 'sunlight', to: 'fresh water', needs: ['raw water'], perKg: L_WATER / 0.35, floorPerKg: L_WATER, grounds: 'it boils the water off with the sun and condenses it on the glass: about a third of the sun\'s heat goes into evaporation (typical 30–40 %), so 2–4 l a day on 1 m²', by: 'typical', parts: ['sheet al-6061 1mm'], note: 'slow but has no moving part' },
  { id: 'sorb', name: 'sorption harvester (desiccant)', from: 'sunlight', to: 'fresh water', needs: ['humid air'], perKg: 1.0e7, floorPerKg: L_WATER, grounds: 'a desiccant drinks the night air\'s water and the sun drives it out to a condenser: about 0.35 l for each kWh of sun (estimate, from reported solar sorption harvesters)', by: 'estimate', parts: [], note: 'works in dry air, where dew does not form' },
  { id: 'wind-rotor', name: 'wind rotor', from: 'wind', to: 'shaft', eta: 0.4, outRpm: 600, grounds: 'no rotor takes more than 16/27 of the wind\'s power (Betz); a small one takes about 40 % (typical), turning near 600 rpm for 1 m² at a tip speed 6 times the wind\'s', by: 'law', parts: ['propeller'] },
  { id: 'wave-float', name: 'wave float', from: 'waves', to: 'push', eta: 0.25, grounds: 'a heaving float takes about a quarter of the power in its width of wave (estimate: point absorbers 20–40 %)', by: 'estimate', parts: ['float'] },
  { id: 'water-wheel', name: 'water turbine', from: 'falling water', to: 'shaft', eta: 0.8, outRpm: 300, grounds: 'a small crossflow or Pelton turbine keeps 70–90 % (typical)', by: 'typical', parts: ['propeller'] },
  { id: 'crank', name: 'hand crank', from: 'muscle', to: 'shaft', eta: 0.95, outRpm: 60, grounds: 'a person cranks at about 60 rpm (typical)', by: 'typical', parts: ['spur gear'] },
  { id: 'lift', name: 'lifting by hand', from: 'muscle', to: 'raised weight', eta: 0.9, grounds: 'raising a weight by a cord over a pulley, most of the work kept as height (estimate)', by: 'estimate', parts: ['spool'] },
  { id: 'drum', name: 'drum and cord', from: 'raised weight', to: 'shaft', eta: 0.95, outRpm: 1.4, grounds: 'the weight unwinds a cord off a 20 mm drum: 1.8 m in 20 minutes turns it at about 1.4 rpm', by: 'law', parts: ['spool'] },
  { id: 'pinion', name: 'rack and pinion', from: 'push', to: 'shaft', eta: 0.9, outRpm: 30, grounds: 'a heaving push turned into turning by a rack (typical 90 %)', by: 'typical', parts: ['spur gear'] },
  { id: 'piston-pump', name: 'piston pump', from: 'push', to: 'pressure', eta: 0.85, grounds: 'a piston pressed by the push pumps at 80–90 % (typical); it reaches the 55–70 bar seawater reverse osmosis needs, as a centrifugal pump of one stage does not', by: 'typical', parts: ['pump diaphragm'] },
  { id: 'rotary-pump', name: 'pump', from: 'shaft', to: 'pressure', eta: 0.7, inRpm: 1500, grounds: 'a small pump keeps about 70 % (typical)', by: 'typical', parts: ['pump diaphragm'] },
  { id: 'hydro-motor', name: 'hydraulic motor', from: 'pressure', to: 'shaft', eta: 0.85, outRpm: 1500, grounds: 'a gear or vane motor keeps 80–90 % (typical)', by: 'typical', parts: ['pump gear'] },
  { id: 'generator', name: 'generator', from: 'shaft', to: 'electric', eta: 0.85, inRpm: 3000, grounds: 'a small permanent-magnet machine (a DC motor turned by hand is one) keeps 80–90 % near its rated speed (typical)', by: 'typical', parts: ['dcmotor 385 12V'] },
  { id: 'motor', name: 'electric motor', from: 'electric', to: 'shaft', eta: 0.8, outRpm: 3000, grounds: 'a small brushed DC motor keeps about 80 % (typical)', by: 'typical', parts: ['dcmotor 385 12V'] },
  { id: 'led', name: 'LED lamp', from: 'electric', to: 'light', lmPerW: 150, grounds: 'a white LED gives about 150 lm for each watt (typical)', by: 'typical', parts: ['led bulb'] },
  { id: 'heater', name: 'heating element', from: 'electric', to: 'heat', eta: 1, grounds: 'all of it, as heat (conservation of energy)', by: 'law', parts: [] },
  { id: 'peltier', name: 'Peltier cooler', from: 'electric', to: 'cold', eta: 0.5, grounds: 'a thermoelectric module moves about half a watt of heat for each watt in, at a small lift (typical COP 0.3–0.7)', by: 'typical', parts: ['tec 12706'] },
  { id: 'vapour', name: 'vapour-compression cooler', from: 'shaft', to: 'cold', eta: 3, inRpm: 3000, grounds: 'a compressor fridge moves about 3 W of heat for each watt of shaft (typical COP 2–3.5)', by: 'typical', parts: [], note: 'a compressor is not kept yet' },
  { id: 'absorption', name: 'absorption cooler', from: 'heat', to: 'cold', eta: 0.25, grounds: 'an ammonia–water–hydrogen cycle (Platen and Munters, the gas fridge) driven by a flame moves about a quarter of its heat out of the box (typical COP 0.2–0.3); no moving part, no electricity', by: 'typical', parts: ['tube copper 10x1'] },
  { id: 'evaporative', name: 'evaporative cooler (pot-in-pot)', from: 'dry air', to: 'cold', needs: ['water'], eta: 0.8, grounds: 'two clay pots, wet sand between: the water soaking through the outer one evaporates into the dry air and draws its heat from the inner one (the zeer pot); most of the cold goes inward (estimate)', by: 'estimate', parts: ['clay pot'], note: 'needs dry air and water to keep the sand wet: in humid air it barely cools' },
  { id: 'condenser', name: 'dew condenser', from: 'cold', to: 'fresh water', needs: ['humid air'], perKg: L_WATER * 1.15, floorPerKg: L_WATER, grounds: 'each kilogram of water condensed out of the air gives up its latent heat, 2.44 MJ, and the air round it is cooled too (about 15 % more: estimate)', by: 'law', parts: ['tec 12706'], note: 'needs air humid enough to reach its dew point' },
  { id: 'ro', name: 'reverse-osmosis membrane', from: 'pressure', to: 'fresh water', needs: ['raw water'], perKg: 3 * 3.6e6 / 1000, floorPerKg: 1.06 * 3.6e6 / 1000, grounds: 'seawater pushed through a membrane at 55–70 bar: about 3 kWh for each m³ with energy recovery (typical 3–4 kWh/m³); the least the laws allow is 1.06 kWh/m³ at half recovered (Elimelech and Phillip, Science 2011); fresher water costs less', by: 'typical', parts: [], note: 'a membrane element is not kept yet' },
  { id: 'teg', name: 'thermoelectric generator', from: 'heat', to: 'electric', eta: 0.05, grounds: 'a bismuth-telluride module across a flame and the air keeps about 5 % of the heat that passes through it (typical 3–6 %); a stove passes only part of its heat through one', by: 'typical', parts: ['peltier-module'] },
  { id: 'stirling', name: 'Stirling engine', from: 'heat', to: 'shaft', eta: 0.2, outRpm: 600, grounds: 'a small Stirling engine keeps about a fifth of its heat (estimate)', by: 'estimate', parts: [], note: 'not kept yet' },
];

/** What is asked for: the flow it must give, the matter it must make, and what it may not use. */
interface Want { flow: Flow; says: string }
const WANTS: { flow: Flow; words: RegExp; says: string }[] = [
  { flow: 'fresh water', words: /\b(drinking water|fresh ?water|potable|desalinat\w*|drinkable|purif\w*|clean water|safe water)\b|\bwater\b.*\b(out of|from)\b.*\b(air|sea|ocean|fog|mist|atmosphere)\b|\b(pulls?|draws?|harvest\w*|makes?|collects?|gets?)\b.*\bwater\b/, says: 'fresh water' },
  { flow: 'cold', words: /\b(cold|cool|cools|cooling|chill\w*|fridge|refrigerat\w*|freez\w*|ice)\b/, says: 'cold' },
  { flow: 'light', words: /\b(light|lights|lamp|lantern|torch|flashlight|glow\w*|illuminat\w*)\b/, says: 'light' },
  { flow: 'electric', words: /\b(electricity|charges?|charging|charger|generat\w*|power for|powers my|phone)\b/, says: 'electricity' },
  { flow: 'heat', words: /\b(heat|heats|heater|warm\w*|hot water|cook\w*)\b/, says: 'heat' },
  { flow: 'pressure', words: /\b(pumps?|pumping|irrigat\w*)\b/, says: 'pumped water' },
  { flow: 'shaft', words: /\b(turns?|spins?|drives?|grinds?|mills?)\b/, says: 'turning' },
];

export interface Stage { effect: Effect | null; name: string; watts: number; /** an adapter put between two ports of a kind but not a size */ adapter?: string }
export interface Chain {
  stages: Stage[]; source: Source; out: { value: number; unit: string; per: string }; floor?: string; keeps: number;
  parts: { words: string; for: string; have: boolean; id?: string }[]; notes: string[]; says: string;
}
export interface Invention { asked: string; want: Want | null; sources: string[]; matter: Matter[]; excluded: string[]; chains: Chain[]; /** the chain that would give the most, whatever it needs */ most?: Chain; why?: string }

const GEAR = { perStage: 6, keeps: 0.95 };
/** Two shaft ports matched: as many gear stages as the ratio needs (each at most 1:6, keeping 95 %), or none. */
function matchShafts(outRpm: number | undefined, inRpm: number | undefined): { stages: number; ratio: number } {
  if (!outRpm || !inRpm) return { stages: 0, ratio: 1 };
  const r = inRpm / outRpm; if (Math.abs(Math.log(r)) < Math.log(1.5)) return { stages: 0, ratio: r };
  return { stages: Math.ceil(Math.abs(Math.log(r)) / Math.log(GEAR.perStage)), ratio: r };
}
const fmt = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toPrecision(2));
const lacks = new Map<string, Item | null>();
const have = (w: string): Item | null => { if (!lacks.has(w)) { const r = resolve(w); lacks.set(w, r && typeof r === 'object' ? r : null); } return lacks.get(w) ?? null; };

/** Read an ask into what it wants, what it may start from, and what it may not use. */
export function readInvention(words: string): { want: Want | null; sources: Source[]; matter: Matter[]; excluded: string[] } {
  const w = ` ${words.toLowerCase()} `, excluded: string[] = [];
  // what it may not use: said with no, without, off, free of
  const noElectric = /\b(no|without|off)[- ](electric\w*|power|grid|mains|batter\w*|plug\w*)\b|\boff[- ]grid\b|\bunpowered\b/.test(w);
  if (noElectric) excluded.push('electricity');
  const clean = w.replace(/\b(no|without|off)[- ](electric\w*|power|grid|mains|batter\w*|plug\w*)\b/g, ' ');
  // what is wanted is what the words ask it to give (what comes after into, or what a thing is for), not what it starts from
  const into = /\binto\s+(.+)$/.exec(clean)?.[1] ?? clean;
  const want = WANTS.find((x) => x.words.test(into)) ?? WANTS.find((x) => x.words.test(clean)) ?? null;
  // where it starts: what the words name, else what is usually at hand (the sun, a person, a flame, and the wall, unless barred)
  const from = /\binto\b/.test(clean) ? clean.split(/\binto\b/)[0]! : clean;
  // (what the words name is what it runs on: a wind pump is not plugged in; only where nothing is named, what is
  // usually at hand: the sun, a person, a flame, the wall)
  let sources = SOURCES.filter((s) => s.words.test(from) && s.flow !== want?.flow);
  if (!sources.length) sources = SOURCES.filter((s) => ['sunlight', 'muscle', 'heat', 'electric'].includes(s.flow) && s.flow !== want?.flow);
  if (noElectric) sources = sources.filter((s) => s.flow !== 'electric');
  const matter = MATTERS.filter((m) => m.words.test(w)).map((m) => m.m);
  // (air is always at hand; water to wet a cooler is, where it is cold that is wanted)
  if (!matter.includes('humid air')) matter.push('humid air');
  if (want?.flow === 'cold' && !matter.includes('water')) matter.push('water');
  return { want: want ? { flow: want.flow, says: want.says } : null, sources, matter, excluded };
}

/** Invent it: every chain of effects from what is at hand to what is wanted, each port meeting a port of its kind
 *  (shafts matched in speed by gears), sized by conservation from its source, best first. */
export function invent(words: string, o: { most?: number } = {}): Invention {
  const r = readInvention(words), out: Chain[] = [];
  const base = { asked: words, want: r.want, sources: r.sources.map((s) => `${s.name} (${s.size})`), matter: r.matter, excluded: r.excluded };
  if (!r.want) return { ...base, chains: [], why: 'nothing it should give was read: say what it should make (water, light, cold, electricity, heat, pumping, turning)' };
  const noElectric = r.excluded.includes('electricity');
  const usable = EFFECTS.filter((e) => (e.needs ?? []).every((m) => r.matter.includes(m)) && !(noElectric && (e.from === 'electric' || e.to === 'electric')));
  // every simple path of at most 6 effects from a source's flow to the flow wanted
  const walk = (src: Source, at: Flow, path: Effect[], seen: Set<Flow>) => {
    if (path.length > 6) return;
    for (const e of usable) {
      if (e.from !== at || seen.has(e.to)) continue;
      const p = [...path, e];
      if (e.to === r.want!.flow) { out.push(size(src, p, r.want!)); continue; }
      walk(src, e.to, p, new Set([...seen, e.to]));
    }
  };
  for (const s of r.sources) walk(s, s.flow, [], new Set([s.flow]));
  // best first: the most of what is wanted, then the fewest stages; one chain per way of effects
  const seen = new Set<string>();
  // (each part the inventory does not have halves a chain's worth: what can be made now wins unless what is missing
  // would give far more, as a membrane does for seawater; then the fewest stages)
  const gaps = (c: Chain) => new Set(c.parts.filter((p) => !p.have).map((p) => p.words)).size, worth = (c: Chain) => c.out.value / 2 ** gaps(c);
  const chains = out.sort((a, b) => worth(b) - worth(a) || a.stages.length - b.stages.length).filter((c) => { const k = c.stages.map((s) => s.name).join('>'); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, o.most ?? 3);
  if (!chains.length) {
    const makers = EFFECTS.filter((e) => e.to === r.want!.flow), barred = makers.filter((e) => !usable.includes(e));
    return { ...base, chains, why: `nothing at hand reaches ${r.want.says}: ${makers.length ? `what makes it (${makers.map((e) => e.name).join(', ')}) ${barred.length ? `needs ${[...new Set(barred.flatMap((e) => [...(e.needs ?? []).filter((m) => !r.matter.includes(m)), ...(noElectric && (e.from === 'electric' || e.to === 'electric') ? ['electricity'] : [])]))].join(' or ')}` : 'is not fed by anything at hand'}` : 'no effect kept makes it'}` };
  }
  const most = [...out].sort((a, b) => b.out.value - a.out.value)[0];
  return { ...base, chains, ...(most && most !== chains[0] && most.out.value > chains[0]!.out.value * 1.2 ? { most } : {}) };
}

/** A chain sized: its source's power through each stage's keeping, gears put between shafts of different speeds. */
function size(src: Source, path: Effect[], want: Want): Chain {
  const stages: Stage[] = [{ effect: null, name: src.name, watts: src.watts }], notes: string[] = [];
  let P = src.watts, keeps = 1, prevRpm: number | undefined;
  for (const e of path) {
    // two shafts that meet are matched in speed: the mirror of a port in kind and in size
    if (e.from === 'shaft') { const m = matchShafts(prevRpm, e.inRpm); if (m.stages) { const k = GEAR.keeps ** m.stages; P *= k; keeps *= k; stages.push({ effect: null, name: `gear train, ${m.stages} stage${m.stages > 1 ? 's' : ''}`, watts: P, adapter: `${fmt(prevRpm!)} rpm to ${fmt(e.inRpm!)} rpm (1:${fmt(m.ratio >= 1 ? m.ratio : 1 / m.ratio)}), each stage at most 1:${GEAR.perStage} and keeping ${GEAR.keeps * 100} %` }); } }
    if (e.eta !== undefined) { P *= e.eta; keeps *= e.eta; }
    stages.push({ effect: e, name: e.name, watts: P });
    if (e.note) notes.push(`${e.name}: ${e.note}`);
    prevRpm = e.outRpm;
  }
  const last = path[path.length - 1]!, prev = stages[stages.length - 2]!;
  let value = P, unit = 'W', per = '', floor: string | undefined;
  if (last.perKg) { const kgPerS = prev.watts / last.perKg; value = kgPerS * 3600; unit = 'l'; per = 'an hour'; if (last.floorPerKg) floor = `from the ${fmt(prev.watts)} W of ${last.from === 'pressure' ? 'pumping' : last.from === 'cold' ? 'cold' : last.from} that reaches the ${last.name}, the laws allow at most ${fmt((prev.watts / last.floorPerKg) * 3600)} l an hour (${fmt(last.floorPerKg / 3600)} Wh of it for each litre, at least)`; stages[stages.length - 1]!.watts = prev.watts; }
  else if (last.lmPerW) { value = prev.watts * last.lmPerW; unit = 'lm'; per = ''; stages[stages.length - 1]!.watts = prev.watts; }
  else if (want.flow === 'cold') { unit = 'W'; per = 'of heat drawn out'; }
  if (src.intermittent && want.flow !== 'fresh water') notes.push(`${src.name} comes and goes: a store (a battery, a tank, a weight raised) keeps it for when it is wanted`);
  if (src.charged) notes.push(`${src.name} is a store, not a flow: ${src.charged}, and it gives back what it was given, less its losses`);
  const parts = path.flatMap((e) => (e.parts.length ? e.parts.map((w) => { const i = have(w); return { words: w, for: e.name, have: !!i, ...(i ? { id: i.id } : {}) }; }) : [{ words: e.name, for: e.name, have: false }]));
  for (const s of stages) if (s.adapter) { const i = have('gear m1 z30'); parts.push({ words: 'gear m1 z30', for: s.name, have: !!i, ...(i ? { id: i.id } : {}) }); }
  const how = want.flow === 'cold' && keeps > 1 ? `moving ${fmt(keeps)} W of heat for each watt it takes` : `${fmt(keeps * 100)} % of its power kept to the last stage`;
  const each = unit === 'W' ? '' : `, ${fmt(value / src.watts)} ${unit}${per ? ` ${per}` : ''} for each watt of it`;
  const says = `${stages.map((s) => s.name).join(' → ')}: ${fmt(value)} ${unit}${per ? ` ${per}` : ''} from ${src.name} (${src.size}${each}), ${how}`;
  return { stages, source: src, out: { value, unit, per }, floor, keeps, parts, notes, says };
}

/** An invention said: what was read, the best chains with their numbers, what each is made of, and what is not kept. */
export function sayInvention(v: Invention): string {
  if (!v.chains.length) return `To invent ${v.asked}: ${v.why}.`;
  const best = v.chains[0]!, missing = [...new Set(best.parts.filter((p) => !p.have).map((p) => p.words))];
  const ifMade = v.most && v.most !== best ? `With parts not kept yet it could do more: ${v.most.says} (needs ${[...new Set(v.most.parts.filter((p) => !p.have).map((p) => p.words))].join(', ')}).` : '';
  return [
    `Invented, as a chain of real effects, each one's output meeting the next one's input (where two shafts turn at different speeds, gears match them): ${best.says}.`,
    best.floor ? `The floor: ${best.floor}.` : '',
    `Made of: ${[...new Set(best.parts.map((p) => `${p.words}${p.have ? '' : ' (not kept yet)'}`))].join(', ')}.`,
    missing.length ? `Not kept yet: ${missing.join(', ')}, so that part is a gap, said, not drawn.` : 'Every part is in the inventory.',
    best.notes.length ? best.notes.join('; ') + '.' : '',
    ifMade,
    ((o) => (o.length ? `Other ways: ${o.map((c) => c.says).join('; ')}.` : ''))(v.chains.slice(1).filter((c) => c !== v.most)),
    v.excluded.length ? `Kept out, as asked: ${v.excluded.join(', ')}.` : '',
  ].filter(Boolean).join(' ');
}

/** An invention as a board: what it starts from, each effect (and each gear train put between), what it gives, the
 *  power along every link, and the parts that make each effect (those not kept said so), every other way beside it. */
export function boardOfInvention(v: Invention, at = Date.now()): Board | null {
  if (!v.chains.length) return null;
  // (a chain: it opens as steps, left to right, each link the power it carries)
  const b: Board = { title: `Invented: ${v.asked}`, kind: 'chain', about: `${sayInvention(v)}`, nodes: {}, edges: {}, createdAt: at, updatedAt: at };
  let e = 0;
  v.chains.forEach((c, k) => {
    let prev: string | null = null;
    c.stages.forEach((s, j) => {
      const id = `w${k}-s${j}`;
      b.nodes[id] = { label: `${k ? `${k + 1}. ` : ''}${s.name}`, note: s.effect ? `${s.effect.grounds}${s.effect.note ? ` · ${s.effect.note}` : ''} · ${s.effect.by}` : s.adapter ? `matches ${s.adapter}` : c.source.grounds };
      if (prev) b.edges[`e${e++}`] = { from: prev, to: id, rel: `${s.effect?.from ?? (s.adapter ? 'shaft' : '')} · ${fmt(c.stages[j - 1]!.watts)} W` };
      prev = id;
      for (const p of c.parts.filter((x) => x.for === s.name)) { const pid = `${id}-p-${p.words.replace(/[^a-z0-9]+/gi, '-')}`; if (b.nodes[pid]) continue; b.nodes[pid] = { label: `${p.have ? '🔩' : '⚠'} ${p.words}`, note: p.have ? `in the inventory${p.id ? `: ${p.id}` : ''}` : 'not kept yet: a gap, said, not drawn' }; b.edges[`e${e++}`] = { from: id, to: pid, rel: 'made of' }; }
    });
    const out = `w${k}-out`; b.nodes[out] = { label: `${fmt(c.out.value)} ${c.out.unit}${c.out.per ? ` ${c.out.per}` : ''} of ${v.want!.says}`, note: c.floor ?? c.says };
    b.edges[`e${e++}`] = { from: prev!, to: out, rel: v.want!.flow };
  });
  return b;
}

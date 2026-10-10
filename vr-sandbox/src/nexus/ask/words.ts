// An ask in plain words, read into an ask as data (src/nexus/ask/spec.ts): what the person said is kept as given by the
// person, and whatever they did not say that the generator needs is filled in as an estimate, on stated grounds, so
// that every number in the intent says where it came from. The reader takes from the words only what is wanted —
// what is carried or lived in or made, how much, how fast, how far, for how long, on what and with what power — and
// never a mechanism: no word here picks a part. It reads three shapes of ask, the ones the generator has builders
// for: something carried (people or a payload, on the ground, through the air, on water), somewhere to be (a room,
// a house), and parts made to any shape (src/nexus/ask/asked.ts).

import { DIMS, findQuantities, sameDim, type Dim, type Said } from '../../ganglia/units';
import { car, house, printer } from './asked';
import { specOf, type AskSpec } from './spec';
import { leaf, type Leaf } from '../substrate/term';
import { vehicle, type Medium, type Source } from '../machines/vehicle';
import type { Intent } from './want';

export interface AskReading {
  /** What kind of ask the words are: something carried, somewhere to be, or parts made. */
  shape: 'carried' | 'place' | 'parts';
  intent: Intent; spec: AskSpec;
  /** What was taken from the words, as the person said it. */
  heard: string[];
  /** What the words did not say and was estimated, with its grounds. */
  assumed: string[];
}

const has = (t: string, re: RegExp) => re.test(t);
const person = 'the person';
const given = (name: string, v: number, unit: string, grounds: string): Leaf => leaf(name, v, unit, { class: 'given', by: person, grounds });
const est = (name: string, v: number, unit: string, grounds: string): Leaf => leaf(name, v, unit, { class: 'estimated', grounds });

/** Read a plain-English ask, or say why it cannot be read. */
export function readAsk(text: string): AskReading | { problems: string[] } {
  const t = ` ${text.toLowerCase().replace(/[“”]/g, '"')} `;
  // areas are said many ways; the general reader takes lengths, so read them first
  const areas: { si: number; text: string }[] = [];
  const plain = t.replace(/(\d+(?:\.\d+)?)\s*(m²|m2|m\^2|sq\.? ?m|square met(?:re|er)s?|sqm)(?![a-z])/g, (_, n: string) => { areas.push({ si: Number(n), text: `${n} m²` }); return ' '; })
    .replace(/(\d+(?:\.\d+)?)\s*(sq\.? ?ft|square f(?:ee|oo)t)(?![a-z])/g, (_, n: string) => { areas.push({ si: Number(n) * 0.092903, text: `${n} sq ft` }); return ' '; });
  const qs = findQuantities(plain);
  const of = (d: Dim) => qs.filter((q) => sameDim(q.dim, d));
  const count = (re: RegExp) => { const m = t.match(new RegExp(`(\\d+|one|two|three|four|five|six|seven|eight)\\s+(?:${re.source})`)); if (!m) return null; const w = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'].indexOf(m[1]!); return w >= 0 ? w + 1 : Number(m[1]); };
  const heard: string[] = [], assumed: string[] = [];
  const hear = (q: Said | { text: string }, what: string) => heard.push(`${what}: ${q.text.trim()}`);

  // parts made to any shape
  if (has(t, /\b(3d[- ]?print|print(er|ing|s)?\b|extrud|filament|make parts|parts of any shape)/)) {
    const lengths = of(DIMS.length).sort((a, b) => b.si - a.si), times = of(DIMS.time);
    const size = lengths.find((q) => q.si >= 0.02), tol = lengths.find((q) => q.si < 2e-3), time = times[0];
    if (size) hear(size, 'largest part'); else assumed.push('largest part: 200 mm, the usual desk printer');
    if (tol) hear(tol, 'tolerance'); else assumed.push('tolerance: 0.2 mm, usual for parts that fit');
    if (time) hear(time, 'time a part may take'); else assumed.push('time a part may take: 8 h, a night');
    const intent = printer({ ...(size ? { size: size.si } : {}), ...(tol ? { tolerance: tol.si } : {}), ...(time ? { time: time.si } : {}) });
    return { shape: 'parts', intent, spec: specOf(intent), heard, assumed };
  }

  // somewhere to be
  if (has(t, /\b(house|home|cabin|cottage|shed|room|studio|office|shelter|apartment|building|live in|bungalow|hut)\b/) && !has(t, /\b(drive|fly|carry|deliver)\b/)) {
    const intent = house(), inside = intent.regions.find((r) => r.id === 'inside')!, people = intent.regions.find((r) => r.id === 'the people')!;
    const n = count(/people|persons|of us|adults|occupants|residents/) ?? (has(t, /\b(couple|two of us)\b/) ? 2 : null);
    const area = areas[0], height = of(DIMS.length).find((q) => q.si >= 2 && q.si <= 6);
    if (n) { heard.push(`people: ${n}`); scalePeople(people, n); }
    if (area) { hear(area, 'floor area'); inside.quantities['Afloor'] = given('floor area of the inside', area.si, 'm^2', `the person: ${area.text}`); }
    else if (n) { inside.quantities['Afloor'] = est('floor area of the inside', 30 * n, 'm^2', 'about 30 m² a person'); assumed.push(`floor area: ${30 * n} m², about 30 m² a person`); }
    else assumed.push('floor area: 120 m² for four people');
    if (height) { hear(height, 'height of the rooms'); inside.quantities['H'] = given('height of the rooms', height.si, 'm', `the person: ${height.text}`); }
    const cold = of(DIMS.temperature).sort((a, b) => a.si - b.si)[0];
    if (cold && cold.si < 283.15) { hear(cold, 'coldest outside'); intent.regions.find((r) => r.id === 'outside air')!.quantities['Tlo'] = leaf('coldest outside air', cold.si - 273.15, 'degC', { class: 'given', by: person, grounds: cold.text }); }
    return { shape: 'place', intent: { ...intent, name: nameOf(text, 'a house') }, spec: specOf(intent), heard, assumed };
  }

  // something carried
  const medium: Medium = has(t, /\b(under ?water|submarine|submersible|dive)/) ? 'under water' : has(t, /\b(fl(y|ies|ying)|drone|air(borne|craft)?|hover|quadcopter|aerial)\b/) ? 'air' : has(t, /\b(boat|ship|sail|float|on water|across the (lake|sea|river)|kayak|ferry)\b/) ? 'water' : has(t, /\b(rails?|train|tram)\b/) ? 'rails' : has(t, /\b(ice|frozen lake)\b/) ? 'ice' : has(t, /\b(space|orbit|vacuum)\b/) ? 'vacuum' : 'road';
  const source: Source = has(t, /\b(petrol|gasoline|diesel|fuel|gas tank)\b/) ? 'fuel at the start' : has(t, /\b(solar|sun(light)?)\b/) ? 'sunlight' : has(t, /\b(pedal|human[- ]powered|muscle)\b/) ? 'a person aboard' : has(t, /\b(wind|sail)\b/) ? 'wind' : 'charge at the start';
  if (!has(t, /\b(carry|carries|move|moves|drive|drives|fly|flies|deliver|ride|go|goes|travel|transport|car|drone|cart|robot|boat|train|vehicle|bike|truck|van|bus|scooter|wagon|trolley|rover)\b/)) return { problems: ['what is it for? say what it carries, where it goes, or what it makes'] };
  const masses = of(DIMS.mass).sort((a, b) => b.si - a.si), speeds = of(DIMS.speed), lengths = of(DIMS.length).sort((a, b) => b.si - a.si), times = of(DIMS.time);
  const n = count(/people|persons|passengers|seats|adults|riders|of us/) ?? (has(t, /\b(family)\b/) ? 4 : null);
  const speed = speeds.sort((a, b) => b.si - a.si)[0];
  const far = lengths.find((q) => q.si >= 100);
  const long = times.find((q) => q.si >= 60);
  if (n && medium === 'road' && source !== 'a person aboard') {
    // people on the road: the ask a car is, with what the person said in place of what it says
    const intent = car(), people = intent.regions.find((r) => r.id === 'the people')!;
    heard.push(`people: ${n}`);
    const luggage = masses[0];
    people.quantities['n'] = given('people', n, '1', 'the person');
    people.quantities['m'] = luggage ? given('mass of the people and their luggage', 80 * n + luggage.si, 'kg', `${n} people at about 80 kg and ${luggage.text}`) : est('mass of the people and their luggage', 100 * n, 'kg', `${n} people and bags, about 100 kg each`);
    if (!luggage) assumed.push(`mass: ${100 * n} kg, ${n} people and bags`); else hear(luggage, 'luggage');
    const seats = Math.ceil(n / 2);
    people.quantities['w'] = est('width the people need', n === 1 ? 0.7 : 1.4, 'm', n === 1 ? 'one seated' : 'two seated side by side');
    people.quantities['l'] = est('length the people need', 0.9 * seats, 'm', `${seats} row${seats > 1 ? 's' : ''}`);
    const set = (id: string, sym: 'lo' | 'hi', l: Leaf) => { const w = intent.wants.find((x) => x.id === id); if (w) w[sym] = l; };
    if (speed) { hear(speed, 'top speed'); set('fast', 'hi', given('top speed', speed.si, 'm/s', speed.text)); }
    if (far) { hear(far, 'range'); set('go far', 'lo', given('range', far.si, 'm', far.text)); }
    const sprint = t.match(/0\s*(?:-|to)\s*(\d+)\s*(km\/h|kph|mph)?\s*in\s*(\d+(?:\.\d+)?)\s*s/);
    if (sprint) { const v = Number(sprint[1]) * (sprint[2] === 'mph' ? 0.44704 : 1 / 3.6), a = v / Number(sprint[3]); heard.push(`acceleration: ${sprint[0].trim()}`); set('pick up', 'lo', given('acceleration', a, 'm/s^2', sprint[0].trim())); }
    if (source === 'fuel at the start') heard.push('power: fuel');
    return { shape: 'carried', intent: { ...intent, name: nameOf(text, 'a car') }, spec: specOf(intent), heard, assumed };
  }
  // a payload anywhere else
  const payload = masses[0];
  const mass = payload ? payload.si : n ? 100 * n : 10;
  if (payload) hear(payload, 'mass carried'); else assumed.push(n ? `mass: ${mass} kg, ${n} people` : 'mass carried: 10 kg');
  const v = speed?.si ?? ({ road: 2, rails: 20, ice: 5, water: 3, 'under water': 1.5, air: 10, vacuum: 1000 } as const)[medium];
  if (speed) hear(speed, 'speed'); else assumed.push(`speed: ${v} m/s`);
  const range = far?.si ?? (long ? long.si * v : v * 1800);
  if (far) hear(far, 'range'); else if (long) hear(long, 'time it keeps going'); else assumed.push(`range: ${(range / 1e3).toFixed(1)} km, half an hour at its speed`);
  heard.push(`moves ${medium === 'road' ? 'on the ground' : medium === 'air' ? 'through the air' : medium === 'vacuum' ? 'in a vacuum' : `on ${medium}`}`, `power: ${source}`);
  const intent = vehicle({ medium, source, gravity: has(t, /\bmoon\b/) ? 'moon' : medium === 'vacuum' && !has(t, /\bearth\b/) ? 'none' : 'earth', mass, speed: v, range });
  return { shape: 'carried', intent: { ...intent, name: nameOf(text, intent.name) }, spec: specOf(intent), heard, assumed };
}

function scalePeople(r: Intent['regions'][number], n: number): void {
  r.quantities['n'] = given('people', n, '1', 'the person');
  r.quantities['m'] = est('mass of the people', 75 * n, 'kg', `${n} people at about 75 kg`);
  const k = n / 4, p = r.produces ?? {};
  for (const [sym, l] of Object.entries(p)) p[sym] = leaf(l.name, l.value! * k, l.unit, { class: 'estimated', grounds: `${l.origin.grounds ?? 'four people'}, scaled to ${n}` });
}
/** A short name for the ask, from its own words. */
function nameOf(text: string, fallback: string): string {
  const m = text.trim().replace(/^(please\s+)?(build|make|design|create|give)\s+(me\s+)?/i, '').split(/[.,;!?]| that | which | where /i)[0]!.trim();
  return m.length >= 3 && m.length <= 60 ? m : fallback;
}

// ---- a demand on what stands, folded into the ask it came from -----------------------------------------------------------
// "carry 300 kg", "make it faster", "for 4 people", "it should go 40 km": a number with a unit takes the place of the
// ask's number of the same kind, or joins the ask where it had none; a comparative with no number moves the ask's own
// number of that kind by half again. What reads as neither changes nothing, and is said to change nothing.
const KINDS: { kind: string; re: RegExp }[] = [
  { kind: 'speed', re: /(\d+(?:\.\d+)?)\s*(km\/h|kph|kmh|mph|m\/s)(?![a-z])/ },
  { kind: 'range', re: /(\d+(?:\.\d+)?)\s*(km|kilomet(?:re|er)s?|miles?)(?![a-z/])/ },
  { kind: 'mass', re: /(\d+(?:\.\d+)?)\s*(kg|kilograms?|tonnes?|t)(?![a-z])/ },
  { kind: 'people', re: /(\d+)\s*(people|persons?|passengers?|seats?|riders?)(?![a-z])/ },
  { kind: 'area', re: /(\d+(?:\.\d+)?)\s*(m²|m2|sq\.? ?m|square met(?:re|er)s?)(?![a-z])/ },
  { kind: 'temperature', re: /(-?\d+(?:\.\d+)?)\s*(°c|deg ?c|degrees?)(?![a-z])/ },
  { kind: 'time', re: /(\d+(?:\.\d+)?)\s*(hours?|h|minutes?|min)(?![a-z])/ },
];
const MORE: { kind: string; re: RegExp; by: number }[] = [
  { kind: 'speed', re: /\b(faster|quicker|more speed|higher speed)\b/, by: 1.5 }, { kind: 'speed', re: /\b(slower|less speed|lower speed)\b/, by: 1 / 1.5 },
  { kind: 'range', re: /\b(further|farther|more range|longer range|go longer)\b/, by: 1.5 }, { kind: 'range', re: /\b(less range|shorter range)\b/, by: 1 / 1.5 },
  { kind: 'mass', re: /\b(carry more|heavier loads?|more load|more payload|carries more)\b/, by: 1.5 }, { kind: 'mass', re: /\b(carry less|lighter loads?|less load)\b/, by: 1 / 1.5 },
  { kind: 'area', re: /\b(bigger|larger|roomier|more room|more space)\b/, by: 1.5 }, { kind: 'area', re: /\b(smaller|less room|less space)\b/, by: 1 / 1.5 },
  { kind: 'people', re: /\b(more people|more seats|one more (?:person|seat))\b/, by: 0 },
];
export interface Folded { words: string; changed: string[] }
export function foldDemand(words: string, demand: string): Folded {
  let out = words; const changed: string[] = [], d = ` ${demand.toLowerCase()} `;
  for (const { kind, re } of KINDS) {
    const m = d.match(re); if (!m) continue;
    const said = `${m[1]} ${m[2]}`, had = out.toLowerCase().match(re);
    if (had && had.index !== undefined) { if (`${had[1]} ${had[2]}` !== said) { out = `${out.slice(0, had.index)}${said}${out.slice(had.index + had[0].length)}`; changed.push(`${kind} ${had[1]} ${had[2]} → ${said}`); } }
    else { out = `${out}, ${said}`; changed.push(`${kind} ${said}, which the ask did not say`); }
  }
  for (const { kind, re, by } of MORE) {
    if (!re.test(d) || changed.some((c) => c.startsWith(kind))) continue;
    const r = KINDS.find((k) => k.kind === kind)!.re, had = out.toLowerCase().match(r);
    if (!had || had.index === undefined) continue;
    const v = Number(had[1]), next = by === 0 ? v + 1 : Number((v * by).toPrecision(2));
    out = `${out.slice(0, had.index)}${next} ${had[2]}${out.slice(had.index + had[0].length)}`;
    changed.push(`${kind} ${had[1]} → ${next} ${had[2]}`);
  }
  return { words: out, changed };
}

// Places: where you are, read from what you say, as numbers: the sun's height (a sunset is the sun at the horizon), the
// sky's colours for it, the ground (sand, grass, rock, snow, Mars's regolith), the sea and how warm it is, rain or snow and
// how fast it falls, the air, and the gravity (Earth's, the Moon's, Mars's, none). Nothing is drawn here
// (src/nexus/view/place3d.ts draws it, src/nexus/view/forge.ts takes you there); this is the place as data, so it can be
// checked and changed.
//
// Numbers are sourced where a source is named, else marked typical or an estimate:
// - gravity: Earth 9.80665 m/s² (standard), the Moon 1.62, Mars 3.71, Jupiter 24.79 (NASA planetary fact sheets);
// - air: sea-level 1.225 kg/m³ at 15 °C (ISA); Mars's surface 0.020 kg/m³, about −65 °C on average (NASA); the Moon none;
// - a falling thing's speed is its terminal speed, √(2mg / (ρ C_d A)): a 2 mm raindrop falls at about 6.5 m/s (Gunn &
//   Kinzer 1949), a snowflake at about 1 m/s (typical); anything else that falls by the same law with its own m, A, C_d;
// - deep-water waves go at ω² = g k (Airy): a 20 m wave has a period of 3.6 s;
// - a blizzard sees under 400 m (the US National Weather Service: a quarter mile); heavy rain is over 7.6 mm/h (AMS).

import { CONST } from '../book/constants';
import { makeTrack, topSpeed } from './karting';
import { makeCoaster, sayCoaster } from './coaster';
import { pingSkillSaid } from './pingpong';

export type Hex = number;
export interface Fall { what: string; m: number; A: number; Cd: number; size: number; color: Hex; perM2s: number; shape: 'drop' | 'flake' | 'bear' | 'thing' }
export interface Prop { kind: string; at: [number, number]; yaw?: number; s?: number }
export interface Room { w: number; d: number; h: number; wall: Hex; floor: Hex; ceiling: Hex; window?: boolean }
export interface Light { kind: 'fire' | 'torch' | 'lamp' | 'spot'; at: [number, number, number]; color: Hex; power: number }
export interface Place {
  name: string;
  /** the sun's height above the horizon and its bearing, degrees (negative: below it) */ sun: { elev: number; az: number };
  sky: { zenith: Hex; horizon: Hex; glow: Hex; stars: boolean };
  ground: { kind: 'sand' | 'grass' | 'rock' | 'snow' | 'regolith' | 'lunar' | 'floor' | 'seabed' | 'ash' | 'soil'; color: Hex; friction: number; relief: number; radius: number };
  water?: { level: number; color: Hex; tempC: number; wave: { height: number; length: number }; under?: boolean };
  fall?: Fall;
  /** m/s² */ gravity: number;
  air: { density: number; tempC: number };
  /** how far you can see, m */ sees: number;
  room?: Room; lights: Light[]; props: Prop[];
  /** your size over a person's 1.7 m: an ant is about 0.003 */ scale: number;
  /** nobody else in it */ alone: boolean;
  says: string[];
  /** what was asked that this place does not have yet */ missing: string[];
}

/** Gravity by body, m/s²: Earth's is the book's own standard gravity (ISO 80000-3), the rest each body's measured
 *  surface value (NASA planetary fact sheets, rounded to three figures). */
export const G = { earth: CONST.g.value!, moon: 1.62, mars: 3.71, jupiter: 24.79, none: 0 } as const;
const AIR = 1.225;

/** A falling thing's terminal speed in still air: where drag, ½ ρ C_d A v², has grown to its weight m g. */
export const terminal = (f: Pick<Fall, 'm' | 'A' | 'Cd'>, g: number, rho: number): number => (rho > 0 ? Math.sqrt((2 * f.m * g) / (rho * f.Cd * f.A)) : Infinity);
/** A deep-water wave's period for its length: ω² = g k. */
export const wavePeriod = (length: number, g: number): number => (2 * Math.PI) / Math.sqrt(g * ((2 * Math.PI) / length));

// what falls: a raindrop's speed is set to Gunn & Kinzer's by its drag coefficient (a 2 mm drop, 4.2 mg); a snowflake's
// to about 1 m/s (a flake is mostly air: 3 mg on 12 mm² is an estimate); a gummy bear is about 2.3 g, 22 by 12 mm (typical)
export const FALLS: Record<string, Fall> = {
  rain: { what: 'raindrops', m: 4.19e-6, A: Math.PI * 0.001 ** 2, Cd: 0.5, size: 0.002, color: 0x9fc8e8, perM2s: 400, shape: 'drop' },
  snow: { what: 'snowflakes', m: 3e-6, A: 1.2e-5, Cd: 4.1, size: 0.006, color: 0xffffff, perM2s: 150, shape: 'flake' },
  'gummy bears': { what: 'gummy bears', m: 2.3e-3, A: 0.022 * 0.012, Cd: 1.0, size: 0.022, color: 0xff4f6d, perM2s: 2, shape: 'bear' },
};

const base = (name: string, over: Partial<Place> = {}): Place => ({
  name, sun: { elev: 50, az: 160 }, sky: { zenith: 0x3b78c4, horizon: 0xb4d8f0, glow: 0xfff3d6, stars: false },
  ground: { kind: 'grass', color: 0x4f7a3a, friction: 0.6, relief: 2, radius: 600 }, gravity: G.earth, air: { density: AIR, tempC: 15 },
  sees: 4000, lights: [], props: [], scale: 1, alone: false, says: [], missing: [], ...over,
});

/** The places there are, by the words for them. */
export const PLACES: { words: RegExp; make: () => Place }[] = [
  { words: /\b(underwater|under the sea|under water|aquarium|reef|deep sea|ocean floor)\b/, make: () => base('under the sea', { sky: { zenith: 0x0a3550, horizon: 0x0e5872, glow: 0x9fe3ff, stars: false }, ground: { kind: 'seabed', color: 0xc9b98a, friction: 0.6, relief: 1.2, radius: 400 }, water: { level: 12, color: 0x0f6a8a, tempC: 22, wave: { height: 0.3, length: 15 }, under: true }, sees: 40, air: { density: 1025, tempC: 22 }, props: [...rocks(16, 0x5c6a62), ...kelp(30)], says: ['12 m under: water 1,025 kg/m³ (sea water), you see about 40 m in clear water (typical)', 'light fades with depth: red goes first, so it is blue'] }) },
  { words: /\b(beach|seaside|shore|coast|ocean|sea\b|island|tropic|waves?|surf(?:ing)?)\b/, make: () => base('a beach', { ground: { kind: 'sand', color: 0xe3cf9f, friction: 0.55, relief: 0.6, radius: 500 }, water: { level: -0.05, color: 0x1f8fa8, tempC: 24, wave: { height: 0.4, length: 18 } }, props: palms(9), says: ['dry sand (friction about 0.55, typical)', 'the sea at 24 °C (a warm summer sea, typical)'] }) },
  { words: /\b(mars|martian|red planet)\b/, make: () => base('the surface of Mars', { sky: { zenith: 0x7a5a44, horizon: 0xd6a77a, glow: 0xfff0dc, stars: false }, ground: { kind: 'regolith', color: 0xa4553a, friction: 0.7, relief: 6, radius: 900 }, gravity: G.mars, air: { density: 0.02, tempC: -65 }, sees: 6000, props: rocks(40, 0x7c3c28), says: ['Mars: gravity 3.71 m/s² (0.38 of Earth\'s; NASA), air 0.020 kg/m³ (1.6 % of ours) at about −65 °C', 'its sky butterscotch by day (dust), blue round the sun at sunset'] }) },
  { words: /\b(moon|lunar)\b/, make: () => base('the Moon', { sky: { zenith: 0x000000, horizon: 0x05060a, glow: 0xffffff, stars: true }, ground: { kind: 'lunar', color: 0x8d8b86, friction: 0.7, relief: 3, radius: 900 }, gravity: G.moon, air: { density: 0, tempC: 120 }, sees: 8000, props: rocks(30, 0x6d6b66), says: ['the Moon: gravity 1.62 m/s² (a sixth of Earth\'s; NASA), no air, so the sky is black in daylight and nothing falls slower for drag'] }) },
  { words: /\b(grand canyon|canyon|gorge|cliffs?)\b/, make: () => base('a canyon rim', { ground: { kind: 'rock', color: 0xb06a3c, friction: 0.7, relief: 1, radius: 1500 }, sees: 20000, props: [{ kind: 'canyon', at: [0, -60] }, ...rocks(14, 0x9a5530)], says: ['the Grand Canyon is about 1.8 km deep and up to 29 km across (US National Park Service); this one is cut 400 m deep, 600 m across (an estimate to fit the view)'] }) },
  { words: /\b(snow|snowstorm|blizzard|snowball|arctic|antarctic|tundra|winter|icy|glacier)\b/, make: () => base('a snowfield', { sky: { zenith: 0x9aa7b4, horizon: 0xd8dee4, glow: 0xffffff, stars: false }, ground: { kind: 'snow', color: 0xf1f4f8, friction: 0.2, relief: 2, radius: 600 }, air: { density: 1.32, tempC: -12 }, sees: 2500, props: pines(14), says: ['snow, friction about 0.2 (typical for boots on packed snow)'] }) },
  { words: /\b(desert|dunes?|sahara)\b/, make: () => base('a desert', { sky: { zenith: 0x4c86c6, horizon: 0xe6dcc4, glow: 0xfff6e0, stars: false }, ground: { kind: 'sand', color: 0xd9b27a, friction: 0.55, relief: 8, radius: 900 }, air: { density: 1.14, tempC: 38 }, props: [...cacti(10), ...rocks(10, 0xa8794a)], says: ['a hot desert at 38 °C, the air thinner for the heat (1.14 kg/m³)'] }) },
  { words: /\b(forest|woods|jungle|rainforest)\b/, make: () => base('a forest', { ground: { kind: 'soil', color: 0x3c4a26, friction: 0.6, relief: 1.5, radius: 600 }, sees: 600, props: pines(70, 4), says: ['a pine forest: you see about 600 m through it (an estimate)'] }) },
  { words: /\b(garden|backyard|yard|park|meadow|field|lawn)\b/, make: () => base('a garden', { ground: { kind: 'grass', color: 0x5b8f3c, friction: 0.6, relief: 0.2, radius: 400 }, props: [...flowers(60), ...rocks(6, 0x8a8478)], says: ['a lawn and flower beds'] }) },
  { words: /\b(space|orbit|outer space|in space|spaceship|space station)\b/, make: () => base('space', { sun: { elev: 20, az: 120 }, sky: { zenith: 0x000000, horizon: 0x000000, glow: 0xffffff, stars: true }, ground: { kind: 'floor', color: 0x111111, friction: 0.5, relief: 0, radius: 0 }, gravity: G.none, air: { density: 0, tempC: -270 }, sees: 1e6, props: [{ kind: 'earth', at: [0, -300] }], says: ['space: no gravity (in orbit everything falls together), no air'] }) },
  { words: /\b(volcano|volcanic|lava)\b/, make: () => base('a volcano', { sky: { zenith: 0x3b2a2a, horizon: 0x8a5a44, glow: 0xffb070, stars: false }, ground: { kind: 'ash', color: 0x2c2826, friction: 0.7, relief: 3, radius: 800 }, air: { density: 1.15, tempC: 30 }, sees: 1500, props: [{ kind: 'volcano', at: [0, -400] }, ...rocks(25, 0x1e1b1a)], lights: [{ kind: 'fire', at: [0, 60, -400], color: 0xff5a1f, power: 4 }], says: ['basalt lava erupts at 1,100–1,200 °C (USGS)'] }) },
  { words: /\b(dinosaurs?|jurassic|cretaceous|prehistoric|mesozoic|t-?rex)\b/, make: () => base('the late Cretaceous', { sky: { zenith: 0x4a7ab4, horizon: 0xd0dccc, glow: 0xfff0d0, stars: false }, ground: { kind: 'soil', color: 0x4a5a2a, friction: 0.6, relief: 3, radius: 900 }, air: { density: 1.2, tempC: 27 }, sees: 2500, props: [...pines(25, 12), ...ferns(60), { kind: 'volcano', at: [300, -900] }], says: ['Earth 70 million years ago: warmer than now (no ice at the poles), conifers, ferns and cycads; grass had barely begun (typical of the late Cretaceous)'] }) },
  { words: /\b(mountains?|alps|peak|summit)\b/, make: () => base('the mountains', { ground: { kind: 'rock', color: 0x6c6a62, friction: 0.7, relief: 25, radius: 2000 }, air: { density: 0.82, tempC: -5 }, sees: 30000, props: [...pines(20), { kind: 'peaks', at: [0, -1500] }], says: ['3,500 m up: air 0.82 kg/m³ (two thirds of sea level, ISA)'] }) },
  // indoors
  { words: /\b(cabin|log cabin|cottage|chalet|lodge)\b/, make: () => base('a cabin', { ground: { kind: 'snow', color: 0xf1f4f8, friction: 0.2, relief: 1.5, radius: 400 }, sky: { zenith: 0x2a3340, horizon: 0x6c7a88, glow: 0xffffff, stars: false }, air: { density: 1.32, tempC: -12 }, sees: 300, room: { w: 5, d: 6, h: 2.6, wall: 0x8a5a32, floor: 0x6b4426, ceiling: 0x5c3a20, window: true }, lights: [{ kind: 'fire', at: [-2.0, 0.45, -2.6], color: 0xff8a3c, power: 2.5 }], props: [{ kind: 'fireplace', at: [-2.25, -2.6], yaw: Math.PI / 2 }, { kind: 'sofa', at: [-0.2, -2.6], yaw: Math.PI / 2 }, { kind: 'rug', at: [-1.1, -2.6], yaw: Math.PI / 2 }], says: ['a log cabin 5 by 6 m inside, its fire about 1,000 °C at the flames (wood fire, typical), warm orange light'] }) },
  { words: /\b(ping ?-?pong|table tennis|tabletennis)\b/, make: () => base('a table tennis hall', { room: { w: 9, d: 14, h: 4.5, wall: 0x2a3440, floor: 0x7a3428, ceiling: 0x1a1e24 }, ground: { kind: 'floor', color: 0x7a3428, friction: 0.6, relief: 0, radius: 0 }, sky: { zenith: 0x0b0d14, horizon: 0x151a26, glow: 0xffffff, stars: false }, sun: { elev: -20, az: 0 }, lights: [{ kind: 'lamp', at: [0, 4.2, -2.6], color: 0xffffff, power: 2.2 }, { kind: 'lamp', at: [0, 4.2, -5.5], color: 0xffffff, power: 1.6 }], props: [{ kind: 'ping pong', at: [0, 0], s: 0.75 }], says: ['a table tennis hall: a table as the ITTF has it, 2.74 by 1.525 m, its top 76 cm up, the net 15.25 cm', 'a robot at the far end: it reads your shot\'s whole flight at once, reaches anywhere at its end, and sends the ball back with topspin'] }) },
  { words: /\b(roller ?coasters?|rollercoasters?|theme park|amusement park|thrill ride|loop the loop)\b/, make: () => base('a roller coaster', { ground: { kind: 'grass', color: 0x4f7a3a, friction: 0.6, relief: 0, radius: 800 }, props: [{ kind: 'coaster', at: [0, 0] }], says: [sayCoaster(makeCoaster())] }) },
  { words: /\b(go[- ]?karts?|go[- ]?karting|karting|karts?|kart track|race ?track|racing circuit|race circuit|grand prix)\b/, make: () => { const tr = makeTrack(); return base('a go-kart track', { ground: { kind: 'grass', color: 0x4f7a3a, friction: 0.6, relief: 0, radius: 600 }, props: [{ kind: 'kart track', at: [0, 0] }], says: [...tr.says, `rental karts: a Honda GX270 (6.3 kW at 3,600 rpm, Honda) governed to about ${Math.round(topSpeed() * 3.6)} km/h, tyres that grip to about 1.1 g`] }); } },
  { words: /\b(bar|pub|tavern|saloon|lounge|pool hall|darts?|billiards?|pool table)\b/, make: () => base('a bar', { room: { w: 9, d: 7, h: 3, wall: 0x3a2418, floor: 0x2a1a10, ceiling: 0x1e140e }, sky: { zenith: 0x0b0d14, horizon: 0x151a26, glow: 0xffd9a0, stars: true }, sun: { elev: -20, az: 0 }, lights: [{ kind: 'lamp', at: [1.5, 2.6, -1.5], color: 0xffd9a0, power: 1.6 }, { kind: 'lamp', at: [-2, 2.6, -2], color: 0xffc070, power: 1.2 }], props: [{ kind: 'bar counter', at: [-3.2, -2.5], yaw: Math.PI / 2 }, { kind: 'stool', at: [-2.5, -1.5] }, { kind: 'stool', at: [-2.5, -2.5] }, { kind: 'stool', at: [-2.5, -3.5] }, { kind: 'pool table', at: [1.5, -1.5] }, { kind: 'dartboard', at: [3.9, -3.2], yaw: -Math.PI / 2 }, { kind: 'oche', at: [1.53, -3.2], yaw: -Math.PI / 2 }], says: ['a bar 9 by 7 m: its counter 1.07 m high (42 in, typical)', 'a 9-foot pool table, its bed 2.54 by 1.27 m and 0.76 m off the floor (WPA)', 'a dartboard 451 mm across, the bull 1.73 m up, the throw line 2.37 m from the board (WDF rules)'] }) },
  { words: /\b(haunted|mansion|castle|manor|dungeon|crypt|spooky)\b/, make: () => base('a haunted mansion', { room: { w: 12, d: 10, h: 4.2, wall: 0x2a2630, floor: 0x241c18, ceiling: 0x18141c, window: true }, sky: { zenith: 0x05060c, horizon: 0x101420, glow: 0xc8d4ff, stars: true }, sun: { elev: -25, az: 0 }, sees: 60, lights: [{ kind: 'torch', at: [0, 0, 0], color: 0xfff4d6, power: 3 }], props: [{ kind: 'staircase', at: [0, -4.4] }, { kind: 'chandelier', at: [0, -1] }, { kind: 'armchair', at: [-3.5, -2], yaw: 0.6 }, { kind: 'clock', at: [5.7, -3.6], yaw: -Math.PI / 2 }], says: ['a mansion hall 12 by 10 m, dark: a torch in your hand (about 300 lumens, typical) lights what you point at'] }) },
  { words: /\b(stadium|arena|concert|stage)\b/, make: () => base('a stadium stage', { sky: { zenith: 0x05070e, horizon: 0x1a2236, glow: 0xffffff, stars: true }, sun: { elev: -15, az: 0 }, ground: { kind: 'floor', color: 0x1a1a1e, friction: 0.6, relief: 0, radius: 150 }, sees: 600, props: [{ kind: 'stage', at: [0, 0] }, { kind: 'stands', at: [0, -40] }], lights: [{ kind: 'spot', at: [-6, 9, 4], color: 0xbfd8ff, power: 4 }, { kind: 'spot', at: [6, 9, 4], color: 0xffd0e0, power: 4 }], says: ['a stage 16 by 10 m, and stands for about 60,000 seats round it (a big stadium, typical)'] }) },
];

// the times of day: the sun's height for each, and the sky it makes
const TIMES: [RegExp, number, string][] = [
  [/\b(sunset|dusk|evening|golden hour|sundown)\b/, 2, 'at sunset (the sun 2° up)'], [/\b(sunrise|dawn|daybreak|morning)\b/, 4, 'at sunrise (the sun 4° up)'],
  [/\b(noon|midday|afternoon|daytime|sunny|day)\b/, 60, 'at midday (the sun 60° up)'], [/\b(night|midnight|stars|starry|moonlight|dark)\b/, -25, 'at night (the sun 25° below the horizon)'],
];
/** The sky's colours for the sun's height: blue by day, orange and pink low down, deep blue to black at night. */
export function skyFor(elev: number, p: Place): Place['sky'] {
  if (p.sky.stars && p.air.density === 0) return p.sky; // no air, no sky colour
  const mars = p.ground.kind === 'regolith';
  if (elev > 15) return mars ? { zenith: 0x7a5a44, horizon: 0xd6a77a, glow: 0xfff0dc, stars: false } : { zenith: 0x3b78c4, horizon: 0xb4d8f0, glow: 0xfff3d6, stars: false };
  if (elev > -4) return mars ? { zenith: 0x3a2e2a, horizon: 0x8a6650, glow: 0x9cc2e8, stars: false } : { zenith: 0x2e3f72, horizon: 0xf29a5a, glow: 0xffb36b, stars: false };
  if (elev > -12) return { zenith: 0x10183a, horizon: 0x5a3c58, glow: 0xff9a7a, stars: true };
  return { zenith: 0x02040a, horizon: 0x0a1222, glow: 0xc8d4ff, stars: true };
}

/** A place read from what was said, or null when no place is named. */
export function readPlace(text: string, current?: Place): Place | null {
  const t = text.toLowerCase();
  // a room named wins over the weather or land round it ("a cabin in a snowstorm" is the cabin, snowing outside),
  const all = PLACES.filter((x) => x.words.test(t)).map((x) => x.make()), ride = (x: Place) => x.props.some((q) => q.kind === 'coaster' || q.kind === 'kart track');
  // and a ride named (a roller coaster, a go-kart track) is where you go, whatever it is in ("a roller coaster through a volcano")
  const found = all.find((x) => x.room) ?? all.find(ride) ?? all[0] ?? null;
  const time = TIMES.find(([w]) => w.test(t)), weather = /\b(gummy|candy|jelly)\b/.test(t) ? 'gummy bears' : /\b(snowstorm|blizzard|snowing|snowfall|snow falling)\b/.test(t) || (/\bsnow\b/.test(t) && /\b(storm|falling|make it)\b/.test(t)) ? 'snow' : /\b(rain|raining|rainy|storm|drizzle|downpour)\b/.test(t) ? 'rain' : null;
  const grav = gravityIn(t), size = sizeIn(t), alone = /\b(nobody|no one|no-one|alone|by myself|empty|deserted|just me)\b/.test(t);
  if (!found && !time && !weather && grav === null && size === null) return null;
  // no place named: the one you are in, changed (its time, weather, gravity, your size), or here as it is
  const p = found ?? (current ? { ...structuredClone(current), says: [], missing: [] } : null) ?? base('here', { ground: { kind: 'floor', color: 0x060b10, friction: 0.6, relief: 0, radius: 0 }, sky: { zenith: 0x04070b, horizon: 0x04070b, glow: 0xffffff, stars: false }, sees: 16 });
  if (!found && !current) p.name = 'here';
  if (time) { p.sun.elev = time[1]; p.sky = skyFor(time[1], p); p.says.push(time[2]); }
  if (weather) {
    p.fall = { ...FALLS[weather]! }; const v = terminal(p.fall, p.gravity || G.earth, p.air.density || AIR);
    p.says.push(`${p.fall.what} falling at ${v.toFixed(1)} m/s (their terminal speed, where drag meets weight)`);
    if (weather === 'snow' && /\b(snowstorm|blizzard|storm)\b/.test(t)) { p.sees = Math.min(p.sees, 400); p.says.push('a blizzard: under 400 m seen (NWS)'); }
    if (weather !== 'gummy bears' && p.sun.elev > 15) p.sky = { ...p.sky, zenith: 0x6a7480, horizon: 0xa8b0b8 };
  }
  if (grav !== null) { p.gravity = grav.g; p.says.push(grav.says); }
  if (size !== null) { p.scale = size.k; p.says.push(size.says); }
  const seaSaid = (c: number, why: string) => { p.water!.tempC = c; const i = p.says.findIndex((x) => /^the sea at/.test(x)); const line = `the sea at ${c} °C (${why})`; if (i >= 0) p.says[i] = line; else p.says.push(line); };
  if (p.water && /\b(warm|tropical|bath)\b/.test(t)) seaSaid(28, 'a tropical sea, typical');
  if (p.water && /\b(cold|freezing|icy)\b/.test(t)) seaSaid(4, 'a cold sea');
  p.alone = alone;
  // how good the robot at the table is: as asked
  const pp = p.props.find((x) => x.kind === 'ping pong');
  if (pp) { pp.s = /\b(way better|much better|better than me|pro|professional|world.?class|unbeatable|hard|hardest|impossible|best)\b/.test(t) ? 1 : /\b(easy|beginner|gentle|slow|kid|novice)\b/.test(t) ? 0.45 : 0.75; p.says[1] = `${p.says[1]!.split(':')[0]}: ${pingSkillSaid(pp.s)}`; }
  // a roller coaster through a volcano: the helix runs round inside a breached crater, over its lava
  if (p.props.some((x) => x.kind === 'coaster') && /\b(volcan\w*|lava|crater)\b/.test(t) && !p.props.some((x) => x.kind === 'coaster volcano')) { p.props.push({ kind: 'coaster volcano', at: [0, 0] }); p.says[0] = sayCoaster(makeCoaster({ volcano: true })); }
  // what was asked and is not here yet: living things in it, and things done in it
  for (const [w, what] of [[/\b(dinosaurs?|t-?rex|raptors?)\b/, 'dinosaurs'], [/\b(whales?|dolphins?|sharks?|fish)\b/, 'sea creatures'], [/\b(penguins?|dogs?|puppy|cats?|horses?|birds?|dragons?)\b/, 'animals'], [/\b(crowd|audience|fans|people (?:watching|cheering))\b/, 'a crowd'], [/\b(orchestra|band|musicians)\b/, 'musicians'], [/\b(ghosts?)\b/, 'ghosts']] as const) if (w.test(t)) p.missing.push(what);
  if (/\b(rome|roman|forum|ancient|medieval|egypt|pyramids?)\b/.test(t)) p.missing.push('its buildings (old architecture is not made yet)');
  if (/\b(surf|surfing|ski|skiing|snowboard)\b/.test(t)) p.missing.push('the board and riding it');
  if (/\bfly\b|\bflying\b|like a (?:hawk|bird|eagle)/.test(t)) p.says.push('fly: the left stick moves you where you look, up and down too (flying is on here)');
  return p;
}

/** Gravity said: off, the Moon's, Mars's, Jupiter's, half, double, or so many m/s² or g. */
export function gravityIn(t: string): { g: number; says: string } | null {
  if (/\b(gravity off|no gravity|zero g(?:ravity)?|zero-g|weightless|turn off gravity|turn gravity off|without gravity|gravity (?:to )?zero)\b/.test(t)) return { g: 0, says: 'gravity off: what is let go of floats where it is' };
  const n = /\bgravity\s*(?:to|at|=)?\s*(\d+(?:\.\d+)?)\s*(g|m\/s²|m\/s2)?\b/.exec(t); if (n) { const g = Number(n[1]) * (n[2] === 'g' ? G.earth : 1); return { g, says: `gravity ${g.toFixed(2)} m/s²` }; }
  for (const [w, g, s] of [[/\b(moon|lunar) gravity\b/, G.moon, "the Moon's gravity, 1.62 m/s²"], [/\bmars(?:'s)? gravity\b/, G.mars, "Mars's gravity, 3.71 m/s²"], [/\bjupiter(?:'s)? gravity\b/, G.jupiter, "Jupiter's gravity, 24.79 m/s²"], [/\b(low gravity|half gravity)\b/, G.earth / 2, 'half gravity, 4.9 m/s²'], [/\b(double gravity|heavy gravity|high gravity)\b/, G.earth * 2, 'double gravity, 19.6 m/s²'], [/\b(normal gravity|earth gravity|gravity (?:back )?on|turn gravity on|gravity back)\b/, G.earth, "Earth's gravity, 9.81 m/s²"]] as const) if (w.test(t)) return { g, says: s };
  return null;
}
/** Your size said: shrunk to an ant's, a mouse's, a cat's, or grown to a giant's. */
export function sizeIn(t: string): { k: number; says: string } | null {
  // your size, said of you: "shrink me", "make me giant", "the size of an ant" (not "a giant aquarium")
  if (!/\b(shrink me|shrink us|tiny me|small as|size of|as big as|grow me|make me (?:a )?(?:big|bigger|huge|tall|small|smaller|tiny|giant)|turn me into a giant|i(?:'m| am| want to be) (?:a )?(?:giant|tiny)|normal size|my size)\b/.test(t)) return null;
  for (const [w, h, s] of [[/\bant\b/, 0.005, 'an ant (about 5 mm, typical of a worker)'], [/\b(bug|beetle|ladybug|insect)\b/, 0.008, 'a beetle (about 8 mm)'], [/\bmouse\b/, 0.07, 'a mouse (about 7 cm)'], [/\b(cat|kitten)\b/, 0.25, 'a cat (about 25 cm at the shoulder)'], [/\b(giant|huge|godzilla|skyscraper)\b/, 17, 'a giant ten times your height'], [/\b(normal size|my size|back to normal)\b/, 1.7, 'your own size']] as const) if (w.test(t)) return { k: h / 1.7, says: `you are the size of ${s}: the world ${(1.7 / h).toFixed(h < 1.7 ? 0 : 1)} times bigger to you` };
  if (/\b(shrink|tiny|small)\b/.test(t)) return { k: 0.1, says: 'you are a tenth of your size' };
  return null;
}

// ---- what stands in a place, laid out by a seeded scatter (the same each time for a place) ----
const scatter = (n: number, seed: number, rMin: number, rMax: number, kind: string, s = 1): Prop[] => {
  let x = seed >>> 0; const r = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
  return Array.from({ length: n }, () => { const a = r() * Math.PI * 2, d = rMin + (rMax - rMin) * Math.sqrt(r()); return { kind, at: [Math.cos(a) * d, Math.sin(a) * d] as [number, number], yaw: r() * 6.28, s: s * (0.7 + 0.6 * r()) }; });
};
function palms(n: number): Prop[] { return scatter(n, 7, 12, 60, 'palm').map((p) => ({ ...p, at: [p.at[0], -Math.abs(p.at[1]) * 0.3 + 20] as [number, number] })); }
function rocks(n: number, _c: Hex): Prop[] { return scatter(n, 11, 6, 120, 'rock'); }
function pines(n: number, rMin = 10): Prop[] { return scatter(n, 13, rMin, 90, 'pine'); }
function cacti(n: number): Prop[] { return scatter(n, 17, 8, 80, 'cactus'); }
function flowers(n: number): Prop[] { return scatter(n, 19, 2.5, 18, 'flower', 1); }
function kelp(n: number): Prop[] { return scatter(n, 23, 4, 30, 'kelp'); }
function ferns(n: number): Prop[] { return scatter(n, 29, 3, 60, 'fern'); }

/** A place said back: where you are and what makes it so, with what was asked that is not in it yet. */
export function sayPlace(p: Place): string {
  const miss = p.missing.length ? ` Not here yet: ${p.missing.join(', ')}.` : '';
  const prep = /^a table tennis hall/.test(p.name) ? 'in' : /^a roller coaster/.test(p.name) ? 'on' : /^a go-kart track/.test(p.name) ? 'at' : /^(a beach|the surface|the Moon|a canyon|a snowfield|a stadium|the mountains|a desert)/.test(p.name) ? 'on' : /^(under|space)/.test(p.name) ? (p.name === 'space' ? 'in' : '') : 'in';
  return `You are ${p.name === 'here' ? 'where you were' : `${prep ? `${prep} ` : ''}${p.name}`}: ${p.says.join('; ')}.${p.gravity !== G.earth && !p.says.some((s) => /gravity/.test(s)) ? ` Gravity ${p.gravity.toFixed(2)} m/s².` : ''}${miss} Say "back to the forge" to come back.`;
}

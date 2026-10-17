// Words to a scene. Everything here is data a later reader can replace whole: the number words, the colour words,
// the nouns that are things, the conditions (time, sky, weather, ground, water), the size and place words, the stop
// words, and the compounds that are read as their parts; the style words are styles.mjs's own table (STYLES), so a
// style the reader names is one the finish paints. read() turns a prompt into a scene and says what it did with
// every token: each one is a thing, a condition, a number, a colour, a modifier, a style, a stop word, part of a
// phrase, or it goes to scene.ignored; every silent choice goes to scene.overridden.
import { STYLES } from './styles.mjs';
//
// The scene the painter reads (time, clouds, fog, rain, snow, storm, ground, road, beach, things, colours, land) keeps
// its shape; things and colours are views over scene.instances, where each mention of a thing keeps its own count,
// colour, size and place ("a red car and a blue car" is two instances). In things, 0 still means "the usual number".

export const NUMBERS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, hundreds: 100, thousand: 1000, thousands: 1000, dozen: 12, dozens: 24, couple: 2, pair: 2, few: 3,
  several: 5, many: 9, lots: 12, single: 1, lone: 1, lonely: 1, solitary: 1,
};
/** No count is drawn above this, however large the number: forty things fill a picture. */
export const MOST = 40;
export const COLOURS = {
  red: [0.80, 0.12, 0.10], blue: [0.15, 0.35, 0.80], green: [0.15, 0.55, 0.20], yellow: [0.92, 0.80, 0.15],
  orange: [0.95, 0.50, 0.10], white: [0.92, 0.92, 0.92], black: [0.08, 0.08, 0.09], grey: [0.5, 0.5, 0.52],
  gray: [0.5, 0.5, 0.52], pink: [0.95, 0.55, 0.70], purple: [0.50, 0.20, 0.65], brown: [0.45, 0.28, 0.15],
  silver: [0.75, 0.77, 0.80], gold: [0.85, 0.68, 0.20],
};
/** The nouns that are things, by the kind the painter draws. 'range' counts only after mountain(s), see PHRASES. */
export const THINGS = {
  mountains: /^(mountains?|alps|peaks?|mountain-ranges?)$/, hills: /^(hills?|hillside|hillsides|hilltops?)$/,
  trees: /^(trees?|forests?|woods?|woodland|pines?|firs?|oaks?|palms?|spruces?|cedars?|birches?)$/,
  houses: /^(houses?|cabins?|cottages?|barns?|huts?|homes?|lodges?|chalets?|village|villages|hamlet|hamlets)$/,
  buildings: /^(buildings?|city|cities|towns?|skyline|skyscrapers?|towers?|cityscape|metropolis|downtown|urban)$/,
  cars:
    /^(cars?|karts?|go-?karts?|trucks?|vehicles?|buggy|buggies|jeeps?|sedans?|vans?|pickups?|lorry|lorries|taxis?)$/,
  boats: /^(boats?|ships?|sailboats?|yachts?|dinghy|dinghies|ferry|ferries|canoes?|kayaks?)$/,
  birds: /^(birds?|gulls?|seagulls?|crows?|ravens?|swallows?)$/,
  sun: /^sun$/, moon: /^moon$/, stars: /^(stars?|starry)$/,
};
/** A noun that names many at once: no count is read from it, and no number before it. */
export const COLLECTIVE = new RegExp(
  '^(forests?|woods|woodland|city|cities|towns?|skyline|alps|mountain-ranges?|cityscape|metropolis|downtown|urban' +
  '|villages?|hamlets?)$',
);
/** Things there is one of, however the word is spelt. */
export const SINGLE = ['sun', 'moon', 'stars'];
/** How many of a thing a plural names when no number does: the drawers' own defaults (things.mjs), and by word. */
export const USUAL = {
  trees: 9, buildings: 11, houses: 3, boats: 2, cars: 2, birds: 7, mountains: 3, hills: 2, sun: 1, moon: 1, stars: 1,
};
export const USUAL_BY_WORD = { village: 6, villages: 6, hamlet: 6, hamlets: 6 };

/** Size words, as a multiplier on the thing they stand before. */
export const SIZE_WORDS = {
  tiny: 0.5, small: 0.5, little: 0.5, miniature: 0.5, huge: 2, giant: 2, tall: 2, big: 2, enormous: 2, massive: 2,
  towering: 2, large: 1.5,
};
/** Place words, as a hint on where the thing stands. */
export const PLACEMENT = {
  near: 'near', close: 'near', nearby: 'near', foreground: 'near', far: 'far', distant: 'far', distance: 'far',
  background: 'far', faraway: 'far', left: 'left', right: 'right', centre: 'centre', center: 'centre',
  middle: 'centre', central: 'centre',
};
export const MOON_PHASES = /^(full|crescent|half|new|gibbous|waxing|waning)$/;
/** no/zero/without/not before a noun deletes it; before a condition word, cancels it. */
export const NEGATION = /^(no|zero|without|not)$/;

/**
 * Words that carry no picture of their own: articles, prepositions, pronouns, and the words that name the picture
 * itself (photo, scene, sky). They are passed over and not reported. 'beside' is not here: it is reported.
 */
export const STOP = new Set((
  'a an the of in on at by with and or to from into onto through across behind before after above below beneath ' +
  'between among along around beyond toward towards up down out off over under past is are was were be being been it ' +
  'its this that these those there here some any very quite rather so too just only also as like than then while ' +
  'during against about for per via upon within next i me my we our you your he she they them his her their ' +
  'picture pictures image images photo photos photograph scene scenery view landscape artwork art style render ' +
  'rendering illustration wallpaper sky skies horizon weather light lighting seen showing featuring depicting'
).split(' '));
/** Where a colour's or a number's backward search stops: a noun or a joining word between it and the thing. */
export const STOP_SCAN = new Set('and with by on over under beside in sky skies horizon'.split(' '));

/** Two or three words that read as one; the joined form is what the matchers see. */
export const PHRASES = [
  ['black', 'and', 'white'], ['hot', 'air', 'balloon'], ['golden', 'hour'], ['blue', 'hour'], ['pixel', 'art'],
  ['early', 'morning'], ['late', 'afternoon'], ['oil', 'painting'], ['line', 'art'], ['mountain', 'range'],
  ['mountain', 'ranges'], ['movie', 'star'], ['movie', 'stars'], ['film', 'star'], ['film', 'stars'], ['go', 'kart'],
  ['go', 'karts'], ['snow', 'capped'], ['night', 'time'], ['day', 'time'], ['old', 'photo'], ['old', 'photograph'],
];
/** Words that mean something only after another: 'track' is a road after race, dirt or train, else nothing. */
const TRACK_AFTER = /^(race|racing|dirt|gravel|train|railway)$/;
export const AFTER = { track: TRACK_AFTER, tracks: TRACK_AFTER };
/** Compounds read as their parts, so one token can be a thing and a condition at once (moonlit: night, moon). */
export const COMPOUNDS = {
  thunderstorm: ['storm'], thunderstorms: ['storm'], rainstorm: ['storm'], rainstorms: ['storm'], hailstorm: ['storm'],
  snowstorm: ['snowing'], snowstorms: ['snowing'], snowfall: ['snowing'], snowflakes: ['snowing'],
  moonlit: ['night', 'moon'], moonlight: ['night', 'moon'], starlit: ['night', 'stars'], starlight: ['night', 'stars'],
  nighttime: ['night'], 'night-time': ['night'], nightfall: ['night'], daytime: ['day'], 'day-time': ['day'],
  midday: ['noon'], 'early-morning': ['dawn'], 'late-afternoon': ['afternoon'],
  farmhouse: ['house'], farmhouses: ['houses'], treehouse: ['house'], treehouses: ['houses'],
  'snow-capped': ['snowy'], snowcapped: ['snowy'], 'snow-covered': ['snowy'], snowcovered: ['snowy'],
  'ice-covered': ['frozen'], seaside: ['beach'], seashore: ['shore'], lakeshore: ['shore'], riverside: ['river'],
  riverbank: ['river'], 'pixel-art': ['pixel'], 'black-and-white': ['mono'], 'oil-painting': ['painting'],
  'line-art': ['sketch'], sunlit: ['sunny'],
};

const HOURS = {
  night: 23, midnight: 0, nights: 23, nighttime: 23, nightfall: 22, sunset: 18.5, dusk: 18.5, evening: 18.5,
  sundown: 18.5, twilight: 19, 'golden-hour': 17, 'blue-hour': 19.5, dawn: 6, sunrise: 6, daybreak: 6, day: 12,
  daytime: 12, daylight: 12, noon: 12, midday: 12, morning: 9, afternoon: 15,
};
const time = (name) => (s, g, w) => {
  s.time = name;
  s.hour = HOURS[w] ?? HOURS[name];
};

/**
 * The words that set a condition, weighed in this order: a later line overrides an earlier one (storm over clear),
 * except that the time of day named first in the prompt wins. `apply(scene, ground, word)` sets the scene; `ground`
 * carries the land named beside water, whether water or a shore was named, whether the sky was called clear, and
 * the things a scene word brings with it (a harbour's boats), all settled after every condition is read.
 */
export const CONDITIONS = [
  { id: 'night', kind: 'time', match: /^(night|midnight|nights|nighttime|nightfall)$/, apply: time('night') },
  {
    id: 'sunset', kind: 'time', match: /^(sunset|dusk|evening|sundown|twilight|golden-hour|blue-hour)$/,
    apply: time('sunset'),
  },
  { id: 'dawn', kind: 'time', match: /^(dawn|sunrise|daybreak)$/, apply: time('dawn') },
  { id: 'day', kind: 'time', match: /^(day|daytime|daylight|noon|midday|morning|afternoon)$/, apply: time('day') },
  { id: 'cloudy', kind: 'sky', match: /^(cloudy|clouds?)$/, apply: (s) => { s.clouds = 0.65; } },
  {
    id: 'overcast', kind: 'sky', match: /^(overcast|gloomy|grey|gray|dull|dreary)$/, apply: (s) => { s.clouds = 0.9; },
  },
  {
    id: 'clear', kind: 'sky', match: /^(clear|cloudless|sunny|sunshine)$/,
    apply: (s, g) => {
      s.clouds = 0.05;
      g.clear = true;
    },
  },
  {
    id: 'storm', kind: 'weather', match: /^(storms?|stormy|thunder|lightning|tempest|gale)$/,
    apply: (s) => {
      s.storm = true;
      s.clouds = 0.95;
      s.rain = 0.8;
      s.wet = true;
    },
  },
  { id: 'fog', kind: 'weather', match: /^(fog|foggy|mist|misty|haze|hazy|smog)$/, apply: (s) => { s.fog = 0.6; } },
  {
    id: 'rain', kind: 'weather', match: /^(rain|rainy|raining|drizzle|drizzly|showers?|downpour|rainfall)$/,
    apply: (s) => { // a storm's rain is already heavier
      s.rain = Math.max(s.rain, 0.6);
      s.wet = true;
    },
  },
  { id: 'wet', kind: 'weather', match: /^(wet|damp|soaked|puddles?)$/, apply: (s) => { s.wet = true; } },
  {
    id: 'season', kind: 'weather', match: /^(autumn|autumnal|fall|spring|summer|winter)$/,
    apply: (s, g, w) => { s.season = w === 'autumnal' || w === 'fall' ? 'autumn' : w; },
  },
  {
    id: 'snowing', kind: 'ground', match: /^(snowing|snowfall|blizzard|flurries|flurry)$/,
    apply: (s, g) => {
      s.snow = 0.7;
      g.land = 'snow';
    },
  },
  {
    id: 'snow', kind: 'ground', match: /^snow$/,
    apply: (s, g) => { // snow falls unless the sky was called clear: then it lies on the ground only
      s.snow = g.clear ? 0 : 0.7;
      g.land = 'snow';
    },
  },
  { id: 'snowy', kind: 'ground', match: /^(snowy|wintry|winter|frosty|frost)$/, apply: (s, g) => { g.land = 'snow'; } },
  {
    id: 'frozen', kind: 'ground', match: /^(frozen|icy|ice)$/,
    apply: (s, g) => {
      s.frozen = true;
      g.land = 'snow';
    },
  },
  { id: 'sand', kind: 'ground', match: /^(desert|sand|dunes?|sandy)$/, apply: (s, g) => { g.land = 'sand'; } },
  {
    id: 'grass', kind: 'ground',
    match: /^(meadows?|grass|grassy|fields?|prairie|pasture|lawn|countryside|farmland|moors?)$/,
    apply: (s, g) => { g.land = 'grass'; },
  },
  {
    id: 'pavement', kind: 'ground',
    match: /^(city|cities|towns?|skyline|streets?|cityscape|metropolis|downtown|urban|avenues?|boulevards?)$/,
    apply: (s, g) => { g.land = 'pavement'; },
  },
  {
    id: 'road', kind: 'ground',
    match: /^(roads?|streets?|highway|motorway|freeway|lanes?|racetracks?|tracks?|avenues?|boulevards?)$/,
    apply: (s) => { s.road = true; },
  },
  { id: 'dirt', kind: 'ground', match: /^(dirt|gravel|lanes?|unpaved|muddy)$/, apply: (s) => { s.roadKind = 'dirt'; } },
  {
    id: 'street', kind: 'ground', match: /^(streets?|avenues?|boulevards?)$/,
    apply: (s, g, w) => { g.extra.push({ kind: 'buildings', count: USUAL.buildings, usual: true, word: w }); },
  },
  {
    id: 'water', kind: 'water',
    match: /^(seas?|ocean|lakes?|water|bay|coast|coastal|coastline|pond|lagoon|loch|fjord)$/,
    apply: (s, g) => { g.water = true; },
  },
  {
    id: 'river', kind: 'water', match: /^(rivers?|streams?|canal|creek|brook|estuary)$/,
    apply: (s, g) => { // water between two banks: the near bank is the shore, grass unless a land was named
      g.water = true;
      g.beach = true;
      g.land = g.land ?? 'grass';
      s.river = true;
    },
  },
  {
    id: 'harbour', kind: 'water', match: /^(harbou?rs?|port|marina|docks?|quay|wharf)$/,
    apply: (s, g, w) => {
      g.water = true;
      g.beach = true;
      g.land = 'pavement';
      g.extra.push({ kind: 'boats', count: 3, word: w }, { kind: 'buildings', count: 4, word: w });
    },
  },
  {
    id: 'island', kind: 'water', match: /^(islands?|isle|atoll|tropical|tropics|palms?)$/,
    apply: (s, g) => {
      g.water = true;
      g.beach = true;
      g.land = g.land ?? 'sand';
    },
  },
  {
    id: 'beach', kind: 'water', match: /^(beach|beaches|shore|shoreline|lakeside)$/,
    apply: (s, g) => { g.beach = true; },
  },
];
/** What 'no X' does for a condition word: the opposite of X. */
const NEGATE = {
  cloudy: (s) => { s.clouds = 0.05; },
  overcast: (s) => { s.clouds = 0.05; },
  rain: (s) => { s.rain = 0; },
  wet: (s) => { s.wet = false; },
  fog: (s) => { s.fog = 0; },
  snow: (s) => { s.snow = 0; },
  snowing: (s) => { s.snow = 0; },
  storm: (s) => { s.storm = false; },
};

/** The prompt as plain lower-case words: what the seed is hashed from (unchanged by the reader's phrases). */
export function words(prompt) {
  return prompt.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
}

/** Whether any vocabulary here knows a word (so it is never reported as ignored). */
export function knows(w) {
  if (STOP.has(w) || NUMBERS[w] !== undefined || /^\d+$/.test(w) || COLOURS[w]) return true;
  if (SIZE_WORDS[w] || PLACEMENT[w]) return true;
  if (MOON_PHASES.test(w) || NEGATION.test(w) || w === 'moonless') return true;
  if (Object.values(THINGS).some((re) => re.test(w)) || CONDITIONS.some((c) => c.match.test(w))) return true;
  return STYLES.some((st) => st.match.test(w));
}

/** The forms a token is matched by: itself, its compound's parts, or its hyphen-split parts when those are known. */
function formsOf(w) {
  if (COMPOUNDS[w]) return COMPOUNDS[w];
  if (knows(w)) return [w];
  if (w.includes('-')) {
    const parts = w.split('-').filter(Boolean).flatMap((p) => COMPOUNDS[p] ?? [p]);
    if (parts.some(knows)) return parts;
  }
  return [w];
}

// ── Tokens ─────────────────────────

/** A word written in the picture: a quoted phrase, or what follows 'the word', 'saying', 'titled', 'text'. */
const QUOTED = /["“”]([^"“”]+)["“”]/;
const SAID =
  /\b(the words?|saying|titled|entitled|captioned|labell?ed|text)\s+(?!in\b|on\b|over\b)([^,.;:!?"“”]+)/i;
const CUT = /\s+(in|on|over|above|under|across|with|at|by|below|behind|before|against|beside|near)\s+/i;

const LEAD = /\b(the words?|saying|titled|entitled|captioned|labell?ed|text)\s*$/i; // what may introduce a quote

function readText(prompt) {
  let m = QUOTED.exec(prompt);
  if (m) { // the quote wins, and the word that introduced it ("saying") is spent with it
    const before = prompt.slice(0, m.index), lead = LEAD.exec(before);
    const rest = `${lead ? before.slice(0, lead.index) : before} ${prompt.slice(m.index + m[0].length)}`;
    return { text: m[1].trim(), rest };
  }
  m = SAID.exec(prompt);
  if (!m) return { text: null, rest: prompt };
  let said = m[2].split(CUT)[0].trim();
  if (/^the word$/i.test(m[1])) said = said.split(/\s+/)[0];
  const span = `${m[1]} ${said}`;
  const spanRe = new RegExp(span.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return { text: said || null, rest: prompt.replace(spanRe, ' ') };
}

/**
 * The prompt as tokens: { w, parts, raw, foreign }. `w` is the lower-case form the matchers see (phrases joined with
 * '-'); `parts` the words of the prompt it came from, for the ignored list; a token with letters outside ASCII is
 * `foreign`: it is reported whole and matches nothing.
 */
function tokenize(prompt) {
  const out = [];
  for (const raw of prompt.split(/\s+/)) {
    const bare = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (!bare) continue;
    if (/[^\x00-\x7f]/.test(bare) && /\p{L}/u.test(bare)) {
      const w = bare.toLowerCase();
      out.push({ w, parts: [w], raw, foreign: true });
      continue;
    }
    const pieces = words(bare);
    for (const w of pieces) {
      if (w.length === 1 && pieces.length > 1 && !/^[ai\d]$/.test(w)) continue; // the t of "don't"
      out.push({ w, parts: [w], raw, foreign: false });
    }
  }
  for (let i = 0; i < out.length; i++) { // phrases, longest first
    for (const phrase of PHRASES) {
      const n = phrase.length;
      if (i + n > out.length || phrase.some((p, k) => out[i + k].w !== p)) continue;
      const taken = out.splice(i, n), raw = taken.map((t) => t.raw).join(' ');
      out.splice(i, 0, { w: phrase.join('-'), parts: taken.map((t) => t.w), raw, foreign: false, phrase: true });
      break;
    }
  }
  return out;
}

// ── Reading ────────────────────────

const kindOf = (f) => Object.keys(THINGS).find((k) => THINGS[k].test(f));
const plural = (f, kind) => COLLECTIVE.test(f) || (!SINGLE.includes(kind) && /s$/.test(f));

/** Reads words into a scene: what the picture is of. Every choice is from a word, or a default named here. */
export function read(prompt) {
  const { text, rest } = readText(prompt);
  const tokens = tokenize(rest);
  const n = tokens.length; // a phrase is never split back into its words: "movie star" is not a star
  const forms = tokens.map((t) => (t.foreign ? [] : t.phrase ? COMPOUNDS[t.w] ?? [t.w] : formsOf(t.w)));
  const used = new Array(n).fill(false), spent = new Array(n).fill(false), isThing = new Array(n).fill(false);
  const s = {
    prompt, recognised: 0, time: 'day', hour: 12, clouds: 0.35, fog: 0, rain: 0, snow: 0, storm: false, wet: false,
    season: null, moonPhase: null, ground: 'grass', land: 'grass', road: false, roadKind: null, beach: false,
    river: false, frozen: false, things: {}, colours: {}, instances: [], ignored: [], overridden: [],
  };
  if (text) s.text = text;
  const g = { land: undefined, water: false, beach: false, clear: false, extra: [] };

  // Things: each token's kind; mentions of one kind side by side merge into one ("pine trees", "a forest of pines").
  const mentions = [];
  for (let i = 0; i < n; i++) {
    for (const f of forms[i]) {
      const kind = kindOf(f);
      if (!kind) continue;
      isThing[i] = true;
      const last = mentions[mentions.length - 1], gap = last ? i - last.end : 0, collective = COLLECTIVE.test(f);
      const linked = gap === 2 && (last.collective || collective) && STOP.has(tokens[i - 1].w);
      if (last && last.kind === kind && (gap === 1 || linked)) {
        last.end = i;
        last.collective = last.collective || collective;
        last.plural = last.collective || plural(f, kind);
        last.word += ` ${tokens[i].w}`;
        if (gap === 2) used[i - 1] = true;
      } else mentions.push({ kind, start: i, end: i, word: tokens[i].w, collective, plural: plural(f, kind) });
      break;
    }
  }
  for (const m of mentions) {
    for (let i = m.start; i <= m.end; i++) used[i] = true;
    const inst = { kind: m.kind, count: 1, size: 1, modifiers: [], word: m.word, index: m.start };
    let number, none = false;
    let blocked = false; // a condition word between ("no clouds, trees"): a negation beyond it is not this thing's
    for (let j = m.start - 1; j >= Math.max(0, m.start - 4); j--) { // back to the nearest number, colour, size, place
      const w = tokens[j].w;
      if (isThing[j] || spent[j] || STOP_SCAN.has(w)) break; // a spent word belongs to the thing before
      if (forms[j].some((f) => CONDITIONS.some((c) => c.match.test(f)))) blocked = true;
      if (NEGATION.test(w)) {
        if (blocked || number !== undefined) continue;
        none = true;
      } else if (number === undefined && (/^\d+$/.test(w) || NUMBERS[w] !== undefined)) {
        if ((w === 'a' || w === 'an') && m.plural) continue; // "a hundred trees": the article is not the count
        number = /^\d+$/.test(w) ? +w : NUMBERS[w];
      } else if (!inst.colour && COLOURS[w]) inst.colour = w;
      else if (SIZE_WORDS[w] && inst.size === 1) {
        inst.size = SIZE_WORDS[w];
        inst.modifiers.push(w);
      } else if (PLACEMENT[w] && !inst.placement) {
        inst.placement = PLACEMENT[w];
        inst.modifiers.push(w);
      } else if (m.kind === 'moon' && MOON_PHASES.test(w)) {
        s.moonPhase = w;
        inst.modifiers.push(w);
      } else continue;
      used[j] = spent[j] = true; // spent on this thing: not a condition word any more ("grey car" is not overcast)
    }
    for (let j = m.end + 1; j <= Math.min(n - 1, m.end + 3) && !inst.placement; j++) { // "the cabin on the left"
      const w = tokens[j].w;
      if (isThing[j]) break;
      if (PLACEMENT[w]) {
        inst.placement = PLACEMENT[w];
        inst.modifiers.push(w);
        used[j] = spent[j] = true;
      } else if (!STOP.has(w)) break;
    }
    if (none) {
      inst.count = 0;
      inst.none = true;
    } else if (SINGLE.includes(m.kind)) inst.count = 1;
    else if (number !== undefined && !m.collective) inst.count = Math.min(MOST, number);
    else if (m.plural) {
      inst.count = USUAL_BY_WORD[m.word] ?? USUAL[m.kind];
      inst.usual = true;
    }
    s.instances.push(inst);
  }

  // Conditions, from the words not already spent on a thing's colour or count (one word may set several: city).
  let conditions = 0;
  const afterOk = (i) => !AFTER[tokens[i].w] || (i > 0 && AFTER[tokens[i].w].test(tokens[i - 1].w));
  const matching = (c) => tokens.map((t, i) => i)
    .filter((i) => !spent[i] && afterOk(i) && forms[i].some((f) => c.match.test(f)));
  const negated = (i) => i > 0 && NEGATION.test(tokens[i - 1].w) && !isThing[i - 1];
  const timeHits = CONDITIONS.filter((c) => c.kind === 'time').flatMap((c) => matching(c).map((i) => ({ c, i })));
  if (timeHits.length) { // the time named first wins
    const { c, i } = timeHits.sort((p, q) => p.i - q.i)[0];
    c.apply(s, g, forms[i].find((f) => c.match.test(f)));
    conditions++;
    for (const hit of timeHits) used[hit.i] = true;
  }
  const setBy = {}; // which condition last set each weighed field, so a later one that undoes it is said
  const weighed = () => ({ clouds: s.clouds, rain: s.rain, snow: s.snow, fog: s.fog, storm: s.storm, land: g.land });
  const spend = (i) => { // a word read, and the word that licensed it ('race' before 'track')
    used[i] = true;
    if (AFTER[tokens[i].w] && i > 0) used[i - 1] = true;
  };
  for (const c of CONDITIONS) {
    if (c.kind === 'time') continue;
    let hits = matching(c);
    if (c.id === 'overcast') { // grey before a thing is its colour (spent above); before an unknown word, that word's
      hits = hits.filter((i) => !/^(grey|gray)$/.test(tokens[i].w) || i + 1 >= n || forms[i + 1].some(knows));
    }
    if (!hits.length) continue;
    const no = hits.filter(negated), before = weighed();
    if (no.length && NEGATE[c.id]) {
      NEGATE[c.id](s);
      for (const i of no) used[i - 1] = true;
    } else c.apply(s, g, forms[hits[0]].find((f) => c.match.test(f)));
    const after = weighed();
    for (const what of Object.keys(after)) {
      if (after[what] === before[what]) continue;
      if (setBy[what] && setBy[what] !== c.id) {
        s.overridden.push({ what, from: before[what], to: after[what], because: `${c.id} outweighs ${setBy[what]}` });
      }
      setBy[what] = c.id;
    }
    conditions++;
    for (const i of hits) spend(i);
  }
  if (g.clear && s.rain > 0 && !s.storm) { // "a wet road after the rain, clear sky": the rain is over
    s.overridden.push({ what: 'rain', from: s.rain, to: 0, because: 'the sky was called clear' });
    s.rain = 0;
  }
  if (g.water || g.beach) {
    s.ground = 'water';
    s.beach = g.beach || !!g.land || s.road;
    s.land = g.land ?? (g.beach ? 'sand' : 'grass');
  } else if (g.land) {
    s.ground = g.land;
    s.land = g.land;
  }
  if (s.road && !s.roadKind) s.roadKind = 'asphalt';

  // The style (the first named, from the finish's own table), the moonless night, and the things a scene word brings
  // with it when they were not named themselves.
  for (let i = 0; i < n && !s.style; i++) {
    const style = STYLES.find((st) => forms[i].some((f) => st.match.test(f)));
    if (!style) continue;
    s.style = style.id;
    used[i] = true;
  }
  for (let i = 0; i < n; i++) {
    if (tokens[i].w !== 'moonless') continue;
    s.moonPhase = 'moonless';
    used[i] = true;
    if (!timeHits.length) s.time = 'night';
  }
  for (const extra of g.extra) {
    if (s.instances.some((inst) => inst.kind === extra.kind)) continue;
    s.instances.push({ ...extra, size: 1, modifiers: [], index: tokens.findIndex((t) => t.w === extra.word) });
  }

  // The views the painter reads: things (0 is the usual number) and one colour per kind (the last named).
  for (const inst of s.instances) {
    const same = s.instances.filter((o) => o.kind === inst.kind), total = same.reduce((sum, o) => sum + o.count, 0);
    if (same.every((o) => o.usual && o.count === USUAL[o.kind])) s.things[inst.kind] = 0;
    else if (total > 0 || !same.some((o) => o.none)) s.things[inst.kind] = total;
    if (inst.colour) s.colours[inst.kind] = inst.colour;
  }
  if ('boats' in s.things && s.ground !== 'water') { // a boat brings its water
    s.overridden.push({ what: 'ground', from: s.ground, to: 'water', because: 'boats' });
    s.beach = s.ground !== 'grass' || s.road || 'houses' in s.things || 'trees' in s.things;
    s.land = s.ground;
    s.ground = 'water';
  }
  for (const sky of ['stars', 'moon']) {
    if (!(sky in s.things) || s.time !== 'day' || timeHits.length) continue;
    s.overridden.push({ what: 'time', from: 'day', to: 'night', because: sky });
    s.time = 'night';
    s.hour = HOURS.night;
  }
  if ('buildings' in s.things && s.ground === 'grass') {
    s.overridden.push({ what: 'ground', from: 'grass', to: 'pavement', because: 'buildings' });
    s.ground = s.land = 'pavement';
  }
  if ('buildings' in s.things && s.ground === 'water' && s.land === 'grass') {
    s.overridden.push({ what: 'land', from: 'grass', to: 'pavement', because: 'buildings' });
    s.land = 'pavement';
  }
  const broken = 'mountains' in s.things || 'hills' in s.things || 'buildings' in s.things || s.ground === 'water';
  if (!broken) { // something to break the horizon
    s.things.hills = 0;
    s.overridden.push({ what: 'hills', from: 'none', to: 'the usual', because: 'nothing else breaks the horizon' });
  }

  // Honesty: what matched nothing, in order, once each; and how much was understood.
  for (let i = 0; i < n; i++) {
    if (used[i] || (forms[i].some(knows) && afterOk(i))) continue;
    for (const p of tokens[i].parts) if (!s.ignored.includes(p)) s.ignored.push(p);
  }
  s.recognised = s.instances.length + conditions + (s.style ? 1 : 0) + (s.text ? 1 : 0);
  return s;
}

/**
 * Whether an ignored word looks like a noun, for --strict: three or more letters and not an adverb (-ly). The reader
 * cannot tell nouns from adjectives, so this errs toward refusing: 'quiet' is noun-looking too.
 */
export const nounLooking = (w) => /^[a-z][a-z-]{2,}$/.test(w) && !/ly$/.test(w) || /[^\x00-\x7f]/.test(w);

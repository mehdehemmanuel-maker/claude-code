// Words to a scene. Everything here is data a later reader can replace whole: the number words, the colour words,
// the nouns that are things, and the conditions (time, sky, weather, ground), each a matcher and what it sets.

export const NUMBERS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozen: 12,
  few: 3, several: 5, many: 9, lots: 12,
};
export const COLOURS = {
  red: [0.80, 0.12, 0.10], blue: [0.15, 0.35, 0.80], green: [0.15, 0.55, 0.20], yellow: [0.92, 0.80, 0.15],
  orange: [0.95, 0.50, 0.10], white: [0.92, 0.92, 0.92], black: [0.08, 0.08, 0.09], grey: [0.5, 0.5, 0.52],
  gray: [0.5, 0.5, 0.52], pink: [0.95, 0.55, 0.70], purple: [0.50, 0.20, 0.65], brown: [0.45, 0.28, 0.15],
  silver: [0.75, 0.77, 0.80], gold: [0.85, 0.68, 0.20],
};
export const THINGS = {
  mountains: /^(mountains?|alps|peaks?|range)$/, hills: /^hills?$/, trees: /^(trees?|forest|woods?|pines?|firs?)$/,
  houses: /^(houses?|cabins?|cottages?|barns?|huts?)$/,
  buildings: /^(buildings?|city|town|skyline|skyscrapers?|towers?)$/,
  cars: /^(cars?|karts?|go-?karts?|trucks?|vehicles?|buggy|jeep)$/, boats: /^(boats?|ships?|sailboats?|yachts?)$/,
  birds: /^(birds?|gulls?|seagulls?|crows?)$/, sun: /^sun$/, moon: /^moon$/, stars: /^(stars?|starry)$/,
};
/** A noun that names many at once: no count is read from it, and no number before it. */
export const COLLECTIVE = /^(forest|woods|city|town|skyline|alps|range)$/;
/** Things there is one of, however the word is spelt. */
export const SINGLE = ['sun', 'moon', 'stars'];

/**
 * The words that set a condition, weighed in this order: a later line overrides an earlier one (storm over clear),
 * except that the first time of day named wins. `apply(scene, ground)` sets the scene; `ground` carries the land
 * named beside water and whether water or a shore was named, settled after all of them are read.
 */
export const CONDITIONS = [
  { id: 'night', kind: 'time', match: /^(night|midnight|nights?|starry|stars)$/, apply: (s) => { s.time = 'night'; } },
  {
    id: 'sunset', kind: 'time', match: /^(sunset|dusk|evening|sundown|twilight)$/,
    apply: (s) => { s.time = 'sunset'; },
  },
  { id: 'dawn', kind: 'time', match: /^(dawn|sunrise|morning|daybreak)$/, apply: (s) => { s.time = 'dawn'; } },
  { id: 'cloudy', kind: 'sky', match: /^(cloudy|clouds?)$/, apply: (s) => { s.clouds = 0.65; } },
  { id: 'overcast', kind: 'sky', match: /^(overcast|gloomy|grey|gray)$/, apply: (s) => { s.clouds = 0.9; } },
  { id: 'clear', kind: 'sky', match: /^(clear|cloudless)$/, apply: (s) => { s.clouds = 0.05; } },
  {
    id: 'storm', kind: 'weather', match: /^(storm|stormy|thunder)$/,
    apply: (s) => {
      s.storm = true;
      s.clouds = 0.95;
      s.rain = 0.8;
    },
  },
  { id: 'fog', kind: 'weather', match: /^(fog|foggy|mist|misty|haze|hazy)$/, apply: (s) => { s.fog = 0.6; } },
  {
    id: 'rain', kind: 'weather', match: /^(rain|rainy|raining|wet|drizzle)$/,
    apply: (s) => { s.rain = Math.max(s.rain, 0.6); }, // a storm's rain is already heavier
  },
  {
    id: 'snow', kind: 'ground', match: /^(snow|snowy|snowing|winter|blizzard)$/,
    apply: (s, g) => {
      s.snow = 0.7;
      g.land = 'snow';
    },
  },
  { id: 'sand', kind: 'ground', match: /^(desert|sand|dunes?|sandy)$/, apply: (s, g) => { g.land = 'sand'; } },
  {
    id: 'grass', kind: 'ground', match: /^(meadow|grass|field|fields|prairie|grassy)$/,
    apply: (s, g) => { g.land = 'grass'; },
  },
  { id: 'pavement', kind: 'ground', match: /^(city|town|skyline|street)$/, apply: (s, g) => { g.land = 'pavement'; } },
  {
    id: 'road', kind: 'ground', match: /^(road|track|street|highway|lane|racetrack)$/,
    apply: (s) => { s.road = true; },
  },
  {
    id: 'water', kind: 'water', match: /^(sea|ocean|lake|water|river|bay|coast|harbour|harbor)$/,
    apply: (s, g) => { g.water = true; },
  },
  { id: 'beach', kind: 'water', match: /^(beach|shore|seaside|lakeside)$/, apply: (s, g) => { g.beach = true; } },
];

/** The prompt as plain lower-case words: what the reader sees, and what the seed is hashed from. */
export function words(prompt) {
  return prompt.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
}

/** Reads words into a scene: what the picture is of. Every choice is from a word, or a default named here. */
export function read(prompt) {
  const ws = words(prompt);
  const has = (re) => ws.some((w) => re.test(w));
  const s = {
    prompt, time: 'day', clouds: 0.35, fog: 0, rain: 0, snow: 0, storm: false, ground: 'grass', road: false,
    beach: false, things: {}, colours: {}, land: 'grass', // the land beside water, when both are named
  };
  const g = { land: undefined, water: false, beach: false };
  let timed = false;
  for (const c of CONDITIONS) {
    if (c.kind === 'time' && timed) continue;
    if (!has(c.match)) continue;
    c.apply(s, g);
    if (c.kind === 'time') timed = true;
  }
  if (g.water || g.beach) {
    s.ground = 'water';
    s.beach = g.beach || !!g.land || s.road;
    s.land = g.land ?? (g.beach ? 'sand' : 'grass');
  } else if (g.land) {
    s.ground = g.land;
    s.land = g.land;
  }
  for (let i = 0; i < ws.length; i++) {
    for (const [thing, re] of Object.entries(THINGS)) {
      if (!re.test(ws[i])) continue;
      // 0 is "the usual number of them" (a forest, mountains); a number before the noun, or one adjective back, counts.
      const collective = COLLECTIVE.test(ws[i]);
      let n = SINGLE.includes(thing) || !(/s$/.test(ws[i]) || collective) ? 1 : 0;
      let colour;
      if (!collective) {
        for (let j = i - 1; j >= Math.max(0, i - 2); j--) {
          if (NUMBERS[ws[j]] === undefined) continue;
          if (j === i - 2 && ws[j].length <= 2) continue; // "two red cars" counts; "a" two back is too weak a claim
          n = NUMBERS[ws[j]];
          break;
        }
      }
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) if (COLOURS[ws[j]]) colour = ws[j];
      s.things[thing] = Math.max(s.things[thing] ?? 0, n);
      if (colour) s.colours[thing] = colour;
    }
  }
  if (s.things.boats && s.ground !== 'water') { // a boat brings its water
    s.beach = s.ground !== 'grass' || s.road || !!s.things.houses || !!s.things.trees;
    s.land = s.ground;
    s.ground = 'water';
  }
  if (s.things.stars && s.time === 'day') s.time = 'night';
  if (s.things.moon && s.time === 'day') s.time = 'night';
  if (s.things.buildings && s.ground === 'grass') s.ground = s.land = 'pavement';
  if (s.things.buildings && s.ground === 'water') s.land = 'pavement';
  const broken = 'mountains' in s.things || 'hills' in s.things || 'buildings' in s.things || s.ground === 'water';
  if (!broken) s.things.hills = 0; // something to break the horizon
  return s;
}

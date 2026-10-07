// The weather where you are, as it is now and for the hours ahead: read from Open-Meteo (open-meteo.com, free, no key),
// for a place found by its name (their geocoding) or for where the device says it is. It is data the rest can use: a rule
// can start on it ("when the wind is over 30 km/h"), the pipeline can design for it (the wind outside, as a load), and
// the robot can remark on it. Nothing here is made up: where it cannot be fetched, it says so and keeps the last it had.
// The forecast (below) adds the week, the sunlight, the places of a name to choose from, and what the weather means for
// making and running things here, each from a number and where that number comes from.

/** What the sky is doing, by its WMO weather code (Open-Meteo documents the codes it returns). */
const WMO: Record<number, [string, string]> = {
  0: ['clear', '☀'], 1: ['mostly clear', '🌤'], 2: ['partly cloudy', '⛅'], 3: ['overcast', '☁'], 45: ['fog', '🌫'], 48: ['rime fog', '🌫'],
  51: ['light drizzle', '🌦'], 53: ['drizzle', '🌦'], 55: ['heavy drizzle', '🌧'], 56: ['freezing drizzle', '🌧'], 57: ['freezing drizzle', '🌧'],
  61: ['light rain', '🌦'], 63: ['rain', '🌧'], 65: ['heavy rain', '🌧'], 66: ['freezing rain', '🌧'], 67: ['freezing rain', '🌧'],
  71: ['light snow', '🌨'], 73: ['snow', '🌨'], 75: ['heavy snow', '❄'], 77: ['snow grains', '🌨'], 80: ['showers', '🌦'], 81: ['showers', '🌧'], 82: ['violent showers', '⛈'],
  85: ['snow showers', '🌨'], 86: ['heavy snow showers', '❄'], 95: ['thunderstorm', '⛈'], 96: ['thunderstorm with hail', '⛈'], 99: ['thunderstorm with hail', '⛈'],
};
export const skyOf = (code: number): { says: string; icon: string } => { const w = WMO[code] ?? ['weather code ' + code, '·']; return { says: w[0], icon: w[1] }; };

export interface Place { name: string; lat: number; lon: number; country?: string; region?: string; tz?: string }
export interface Weather {
  place: Place; at: number;
  /** now: °C, km/h, km/h, degrees the wind comes from, mm in the last hour, %, the WMO code */
  temp: number; wind: number; gusts: number; dir: number; rain: number; humidity: number; code: number;
  /** the hours ahead, from now: °C, km/h, % chance of rain, the WMO code */
  hours: { t: number; temp: number; wind: number; rainChance: number; code: number }[];
}

/** The numbers a rule or a check reads from the weather (km/h, °C, mm, %). */
export function weatherFacts(w: Weather | null): Record<string, number> {
  if (!w) return {};
  const raining = w.rain > 0 || (w.code >= 51 && w.code <= 67) || (w.code >= 80 && w.code <= 82) || w.code >= 95 ? 1 : 0;
  return { wind: w.wind, gusts: w.gusts, temperature: w.temp, rain: w.rain, raining, humidity: w.humidity, snowing: (w.code >= 71 && w.code <= 77) || w.code === 85 || w.code === 86 ? 1 : 0, storm: w.code >= 95 ? 1 : 0 };
}

/** Where the wind comes from, as a compass says it. */
export const compass = (deg: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((((deg % 360) + 360) % 360) / 45) % 8]!;

/** The weather, read from what Open-Meteo returns for a place. */
export function readWeather(place: Place, j: unknown, at = Date.now()): Weather {
  const r = j as { current?: Record<string, number | string>; hourly?: Record<string, (number | string)[]> };
  const c = r.current; if (!c) throw new Error('the weather service sent nothing for now');
  const n = (k: string) => Number(c[k] ?? 0);
  const h = r.hourly ?? {}, times = (h['time'] ?? []) as string[], now = Date.parse(String(c['time'] ?? '')) || at;
  const hours = times.map((t, i) => ({ t: Date.parse(t), temp: Number(h['temperature_2m']?.[i] ?? NaN), wind: Number(h['wind_speed_10m']?.[i] ?? NaN), rainChance: Number(h['precipitation_probability']?.[i] ?? 0), code: Number(h['weather_code']?.[i] ?? 0) }))
    .filter((x) => x.t >= now - 30 * 60e3).slice(0, 12);
  return { place, at, temp: n('temperature_2m'), wind: n('wind_speed_10m'), gusts: n('wind_gusts_10m'), dir: n('wind_direction_10m'), rain: n('precipitation'), humidity: n('relative_humidity_2m'), code: n('weather_code'), hours };
}

type Fetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
export const FORECAST = 'https://api.open-meteo.com/v1/forecast', GEO = 'https://geocoding-api.open-meteo.com/v1/search';

/** The weather at a place, now and for the hours ahead (km/h, °C). */
export async function fetchWeather(place: Place, get: Fetch = (u) => fetch(u)): Promise<Weather> {
  const q = new URLSearchParams({ latitude: String(place.lat), longitude: String(place.lon), current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m', hourly: 'temperature_2m,wind_speed_10m,precipitation_probability,weather_code', forecast_days: '2', timezone: 'auto', wind_speed_unit: 'kmh' });
  const r = await get(`${FORECAST}?${q}`); if (!r.ok) throw new Error(`the weather service answered ${r.status}`);
  return readWeather(place, await r.json());
}
/** A place by its name ("Denver", "Leeds, UK"): the first the geocoder finds. */
export async function findPlace(name: string, get: Fetch = (u) => fetch(u)): Promise<Place> {
  const r = await get(`${GEO}?${new URLSearchParams({ name: name.replace(/,.*$/, '').trim(), count: '1' })}`); if (!r.ok) throw new Error(`the place finder answered ${r.status}`);
  const j = (await r.json()) as { results?: { name: string; latitude: number; longitude: number; country?: string }[] };
  const p = j.results?.[0]; if (!p) throw new Error(`no place called ${name} was found`);
  return { name: p.name, lat: p.latitude, lon: p.longitude, ...(p.country ? { country: p.country } : {}) };
}

/** The weather said in a line, and as a load the wind puts on what stands in it (½ ρ v², ρ 1.2 kg/m³). */
export function sayWeather(w: Weather): string {
  const s = skyOf(w.code), q = 0.5 * 1.204 * (w.gusts / 3.6) ** 2;
  return `${w.place.name}: ${s.says}, ${Math.round(w.temp)} °C, wind ${Math.round(w.wind)} km/h from the ${compass(w.dir)}, gusts ${Math.round(w.gusts)} km/h (${Math.round(q)} Pa on a face square to them)${w.rain ? `, ${w.rain} mm of rain this hour` : ''}`;
}

// ---- the forecast: now, the next 24 hours and the week, sunlight, and what it means here ----------------------------------
/** What the sky is doing, in a word or two, and as an icon (the moon for a clear night). */
export const sky = (code: number): string => skyOf(code).says;
export const skyIcon = (code: number, day = true): string => (!day && code <= 1 ? '☾' : skyOf(code).icon);
export interface Now { time: string; temp: number; feels: number; humidity: number; rain: number; code: number; wind: number; gusts: number; windFrom: number; pressure: number; day: boolean; sun: number }
export interface Hour { time: string; temp: number; rainChance: number; code: number; sun: number }
export interface Day { date: string; code: number; hi: number; lo: number; rain: number; rainChance: number; sunrise: string; sunset: string; uv: number; wind: number }
export interface Forecast { place: Place; tz: string; elevation: number; now: Now; hours: Hour[]; days: Day[]; at: number }

const CURRENT = 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,is_day,shortwave_radiation';
const HOURLY = 'temperature_2m,precipitation_probability,weather_code,shortwave_radiation';
const DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max';
/** The forecast asked for: now, the next 24 hours and 7 days, in the place's own time, wind in m/s. */
export const forecastUrl = (lat: number, lon: number): string => `${FORECAST}?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=${CURRENT}&hourly=${HOURLY}&daily=${DAILY}&timezone=auto&forecast_days=7&forecast_hours=24&wind_speed_unit=ms`;
export const placesUrl = (name: string, count = 5): string => `${GEO}?name=${encodeURIComponent(name.trim())}&count=${count}&language=en&format=json`;

type Obj = Record<string, unknown>;
const num = (x: unknown, d = 0): number => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const arr = (o: Obj | undefined, k: string): unknown[] => (o && Array.isArray(o[k]) ? (o[k] as unknown[]) : []);

/** Open-Meteo's answer read into a forecast, or why it cannot be. */
export function readForecast(j: unknown, place: Partial<Place> = {}, at = Date.now()): Forecast | string {
  if (!j || typeof j !== 'object') return 'The forecast came back empty.';
  const o = j as Obj;
  if (o.error) return `The forecast service said: ${String(o.reason ?? 'error')}`;
  const c = o.current as Obj | undefined; if (!c) return 'The forecast came back with nothing for now.';
  const h = o.hourly as Obj | undefined, d = o.daily as Obj | undefined;
  const lat = num(o.latitude, place.lat), lon = num(o.longitude, place.lon), tz = String(o.timezone ?? place.tz ?? 'GMT');
  const now: Now = {
    time: String(c.time ?? ''), temp: num(c.temperature_2m), feels: num(c.apparent_temperature, num(c.temperature_2m)), humidity: num(c.relative_humidity_2m),
    rain: num(c.precipitation), code: num(c.weather_code), wind: num(c.wind_speed_10m), gusts: num(c.wind_gusts_10m, num(c.wind_speed_10m)), windFrom: num(c.wind_direction_10m),
    pressure: num(c.surface_pressure, 1013), day: num(c.is_day, 1) === 1, sun: num(c.shortwave_radiation),
  };
  const hours: Hour[] = arr(h, 'time').map((t, i) => ({ time: String(t), temp: num(arr(h, 'temperature_2m')[i]), rainChance: num(arr(h, 'precipitation_probability')[i]), code: num(arr(h, 'weather_code')[i]), sun: num(arr(h, 'shortwave_radiation')[i]) }));
  const days: Day[] = arr(d, 'time').map((t, i) => ({
    date: String(t), code: num(arr(d, 'weather_code')[i]), hi: num(arr(d, 'temperature_2m_max')[i]), lo: num(arr(d, 'temperature_2m_min')[i]), rain: num(arr(d, 'precipitation_sum')[i]),
    rainChance: num(arr(d, 'precipitation_probability_max')[i]), sunrise: String(arr(d, 'sunrise')[i] ?? ''), sunset: String(arr(d, 'sunset')[i] ?? ''), uv: num(arr(d, 'uv_index_max')[i]), wind: num(arr(d, 'wind_speed_10m_max')[i]),
  }));
  return { place: { name: place.name ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`, lat, lon, country: place.country, region: place.region, tz }, tz, elevation: num(o.elevation), now, hours, days, at };
}
/** The place search's answer: the places of that name, the most likely first (as the service orders them). */
export function readPlaces(j: unknown): Place[] {
  const rs = j && typeof j === 'object' && Array.isArray((j as Obj).results) ? ((j as Obj).results as Obj[]) : [];
  return rs.filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number').map((r) => ({ name: String(r.name ?? ''), lat: r.latitude as number, lon: r.longitude as number, country: r.country ? String(r.country) : undefined, region: r.admin1 ? String(r.admin1) : undefined, tz: r.timezone ? String(r.timezone) : undefined }));
}
const unreachable = 'The forecast is not reachable from here (offline, or this page may not fetch it).';
export async function fetchForecast(lat: number, lon: number, place: Partial<Place> = {}, get: Fetch = (u) => fetch(u)): Promise<Forecast | string> {
  try { const r = await get(forecastUrl(lat, lon)); if (!r.ok) return `The forecast service answered ${r.status}.`; return readForecast(await r.json(), place); } catch { return unreachable; }
}
export async function findPlaces(name: string, get: Fetch = (u) => fetch(u)): Promise<Place[] | string> {
  if (name.trim().length < 2) return 'A place needs at least two letters.';
  try { const r = await get(placesUrl(name)); if (!r.ok) return `The place search answered ${r.status}.`; const ps = readPlaces(await r.json()); return ps.length ? ps : `No place called "${name.trim()}" was found.`; } catch { return unreachable.replace('forecast', 'place search'); }
}
export const placeName = (p: Place): string => [p.name, p.region && p.region !== p.name ? p.region : '', p.country].filter(Boolean).join(', ');

/** The next n hours' greatest chance of rain, %. */
export const rainAhead = (f: Forecast, n = 6): number => Math.max(0, ...f.hours.slice(0, n).map((h) => h.rainChance));
/** The forecast as numbers rules read: outside_…, in °C, m/s, mm, %, W/m². */
export function forecastFacts(f: Forecast | null): Record<string, number> {
  if (!f) return {};
  const n = f.now;
  return { outside_temp: Math.round(n.temp * 10) / 10, outside_feels: Math.round(n.feels * 10) / 10, outside_humidity: Math.round(n.humidity), outside_wind: Math.round(n.wind * 10) / 10, outside_gusts: Math.round(n.gusts * 10) / 10, outside_rain: Math.round(n.rain * 10) / 10, outside_rain_chance: rainAhead(f), outside_sun: Math.round(n.sun), outside_day: n.day ? 1 : 0, outside_uv: Math.round((f.days[0]?.uv ?? 0) * 10) / 10, outside_code: n.code, outside_pressure: Math.round(n.pressure) };
}
export function weatherLine(f: Forecast): string { const n = f.now; return `${placeName(f.place)}: ${n.temp.toFixed(0)} °C (feels ${n.feels.toFixed(0)}), ${sky(n.code)}, ${n.humidity.toFixed(0)} % humidity, wind ${n.wind.toFixed(1)} m/s from the ${compass(n.windFrom)}${n.gusts > n.wind + 1 ? ` gusting ${n.gusts.toFixed(1)}` : ''}; rain chance in the next 6 h ${rainAhead(f)} %.`; }

// ---- what it means for making and running things here ------------------------------------------------------------------
export interface Advice { what: string; level: 'ok' | 'mind' | 'stop'; says: string }
/** A 60-cell panel's area and efficiency: 1.65 m × 0.99 m, the usual size of the type; about 20 % for mono-crystalline
 *  modules of the 2020s (an estimate, typical of datasheets), so about 330 W at the standard test's 1000 W/m². */
export const PANEL = { area: 1.65 * 0.99, efficiency: 0.2 };
/** Water and steam at 100 °C, 1 atm (steam tables): water expands this many times as it boils. */
export const STEAM_EXPANSION = 958.4 / 0.5977;
/** The wind a small camera drone is rated to hold against: 10.7 m/s ("Level 5", DJI Mini 4 Pro specifications). */
export const DRONE_WIND = 10.7;
export function forMaking(f: Forecast): Advice[] {
  const n = f.now, wet = rainAhead(f), out: Advice[] = [];
  const steam = Math.round(STEAM_EXPANSION / 100) * 100;
  out.push(n.rain > 0 || wet >= 50
    ? { what: 'Casting', level: 'stop', says: `${n.rain > 0 ? `It is raining (${n.rain} mm in the last quarter hour)` : `Rain is ${wet} % likely in the next 6 h`}: pour indoors, and keep the flask, crucible and tongs dry. Water that meets molten metal boils to about ${steam} times its volume (958 kg/m³ as water, 0.598 as steam at 100 °C) and throws the metal.` }
    : { what: 'Casting', level: 'ok', says: `Dry (${wet} % chance of rain in the next 6 h). Still warm the tools before they touch the melt: damp on cold steel boils to ${steam} times its volume.` });
  out.push(n.humidity >= 60
    ? { what: 'Filament', level: 'mind', says: `Air at ${n.humidity.toFixed(0)} % humidity: nylon takes up water from damp air (nylon 6 holds 2.6 % by weight at 50 % humidity, 9.5 % soaked: BASF Ultramid B datasheet), and wet nylon, PETG and TPU print stringy and weak. Keep them sealed with desiccant; PLA takes up far less. (Inside air is drier than outside when heated: this is the outside number.)` }
    : { what: 'Filament', level: 'ok', says: `Air at ${n.humidity.toFixed(0)} % humidity outside: dry enough that spools left out an afternoon stay printable.` });
  out.push(n.gusts > DRONE_WIND
    ? { what: 'Flying a drone', level: 'stop', says: `Gusts of ${n.gusts.toFixed(1)} m/s are past the ${DRONE_WIND} m/s a small drone is rated to hold against (DJI Mini 4 Pro, Level 5): it would be blown off.` }
    : n.gusts > 0.7 * DRONE_WIND
      ? { what: 'Flying a drone', level: 'mind', says: `Gusts of ${n.gusts.toFixed(1)} m/s are near the ${DRONE_WIND} m/s a small drone is rated for: it will fly, but fight the wind and drain faster.` }
      : { what: 'Flying a drone', level: 'ok', says: `Wind ${n.wind.toFixed(1)} m/s, gusts ${n.gusts.toFixed(1)}: well inside the ${DRONE_WIND} m/s a small drone is rated to hold against.` });
  const W = (g: number) => Math.round(PANEL.area * PANEL.efficiency * g), best = f.hours.reduce((b, h) => (h.sun > b.sun ? h : b), { time: '', sun: 0 } as Pick<Hour, 'time' | 'sun'>);
  out.push({ what: 'A solar panel', level: n.sun > 200 ? 'ok' : 'mind', says: `Sunlight now ${n.sun.toFixed(0)} W/m²: a 60-cell panel (${PANEL.area.toFixed(2)} m², about ${PANEL.efficiency * 100} % efficient, typical of the type) gives about ${W(n.sun)} W.${best.sun > n.sun ? ` The best hour ahead is ${best.time.slice(11, 16)} at ${best.sun.toFixed(0)} W/m²: about ${W(best.sun)} W.` : ''} (Before losses to heat and wiring, which take 10–20 % more.)` });
  return out;
}

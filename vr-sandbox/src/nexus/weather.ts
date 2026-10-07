// The weather where you are, as it is now and for the hours ahead: read from Open-Meteo (open-meteo.com, free, no key),
// for a place found by its name (their geocoding) or for where the device says it is. It is data the rest can use: a rule
// can start on it ("when the wind is over 30 km/h"), the pipeline can design for it (the wind outside, as a load), and
// the robot can remark on it. Nothing here is made up: where it cannot be fetched, it says so and keeps the last it had.

/** What the sky is doing, by its WMO weather code (Open-Meteo documents the codes it returns). */
const WMO: Record<number, [string, string]> = {
  0: ['clear', '☀'], 1: ['mostly clear', '🌤'], 2: ['partly cloudy', '⛅'], 3: ['overcast', '☁'], 45: ['fog', '🌫'], 48: ['rime fog', '🌫'],
  51: ['light drizzle', '🌦'], 53: ['drizzle', '🌦'], 55: ['heavy drizzle', '🌧'], 56: ['freezing drizzle', '🌧'], 57: ['freezing drizzle', '🌧'],
  61: ['light rain', '🌦'], 63: ['rain', '🌧'], 65: ['heavy rain', '🌧'], 66: ['freezing rain', '🌧'], 67: ['freezing rain', '🌧'],
  71: ['light snow', '🌨'], 73: ['snow', '🌨'], 75: ['heavy snow', '❄'], 77: ['snow grains', '🌨'], 80: ['showers', '🌦'], 81: ['showers', '🌧'], 82: ['violent showers', '⛈'],
  85: ['snow showers', '🌨'], 86: ['heavy snow showers', '❄'], 95: ['thunderstorm', '⛈'], 96: ['thunderstorm with hail', '⛈'], 99: ['thunderstorm with hail', '⛈'],
};
export const skyOf = (code: number): { says: string; icon: string } => { const w = WMO[code] ?? ['weather code ' + code, '·']; return { says: w[0], icon: w[1] }; };

export interface Place { name: string; lat: number; lon: number; country?: string }
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
const FORECAST = 'https://api.open-meteo.com/v1/forecast', GEO = 'https://geocoding-api.open-meteo.com/v1/search';

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

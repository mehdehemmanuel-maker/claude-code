// The weather read from a real answer of Open-Meteo's (Lagos, 7 October 2026, kept unchanged in data/): now, the
// hours and the week; places found by name; the facts rules read; and what it means for making things here.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { guessStep, triggerOf } from '../../src/nexus/flows';
import { DRONE_WIND, STEAM_EXPANSION, compass, fetchForecast, findPlaces, forMaking, forecastFacts, forecastUrl, placeName, readForecast, readPlaces, sky, weatherLine, type Forecast } from '../../src/nexus/weather';

const kept = JSON.parse(readFileSync(new URL('./data/open-meteo-lagos.json', import.meta.url), 'utf8')) as { forecast: unknown; places: unknown };
const lagos = readForecast(kept.forecast, { name: 'Lagos', country: 'Nigeria' }) as Forecast;

describe('the forecast, read', () => {
  it('now, the next 24 hours and 7 days, in the place\'s own time', () => {
    expect(typeof lagos).toBe('object');
    expect(lagos.tz).toBe('Africa/Lagos');
    expect(lagos.now).toMatchObject({ temp: 25, feels: 30.2, humidity: 93, rain: 0.1, code: 51, gusts: 2.8, windFrom: 225, day: false, sun: 0 });
    expect(lagos.hours).toHaveLength(24); expect(lagos.days).toHaveLength(7);
    expect(lagos.days[0]).toMatchObject({ date: '2026-10-07', code: 95, hi: 28, lo: 25, rain: 8, uv: 8.2 });
    expect(sky(95)).toBe('thunderstorm'); expect(compass(225)).toBe('SW');
    expect(weatherLine(lagos)).toMatch(/^Lagos, Nigeria: 25 °C \(feels 30\), light drizzle, 93 % humidity, wind 1\.3 m\/s from the SW gusting 2\.8; rain chance in the next 6 h 58 %\.$/);
  });
  it('an answer with nothing in it, or an error, is said as that', () => {
    expect(readForecast(null)).toMatch(/empty/);
    expect(readForecast({ error: true, reason: 'Latitude must be in range of -90 to 90°.' })).toMatch(/said: Latitude/);
    expect(readForecast({ latitude: 1 })).toMatch(/nothing for now/);
  });
  it('asks for what it reads', () => {
    const u = forecastUrl(6.454, 3.395);
    for (const k of ['current=', 'shortwave_radiation', 'precipitation_probability', 'uv_index_max', 'timezone=auto', 'wind_speed_unit=ms', 'forecast_hours=24']) expect(u).toContain(k);
  });
});

describe('places by name', () => {
  it('each with where it is, the likeliest first; none found, or none reached, said', async () => {
    const ps = readPlaces(kept.places);
    expect(ps).toHaveLength(3); expect(placeName(ps[0]!)).toBe('Lagos, Nigeria'); expect(ps[1]!.country).toBe('France');
    expect(await findPlaces('Lagos', async () => ({ ok: true, status: 200, json: async () => kept.places }))).toHaveLength(3);
    expect(await findPlaces('Qqqzx', async () => ({ ok: true, status: 200, json: async () => ({ generationtime_ms: 0.1 }) }))).toMatch(/No place called "Qqqzx"/);
    expect(await findPlaces('Lagos', async () => { throw new TypeError('Failed to fetch'); })).toMatch(/not reachable/);
    expect(await fetchForecast(6.4, 3.4, {}, async () => ({ ok: false, status: 429, json: async () => ({}) }))).toMatch(/answered 429/);
  });
});

describe('what rules read, and what it means here', () => {
  it('facts as numbers', () => {
    expect(forecastFacts(lagos)).toMatchObject({ outside_temp: 25, outside_humidity: 93, outside_rain_chance: 58, outside_gusts: 2.8, outside_day: 0, outside_uv: 8.2 });
    expect(forecastFacts(null)).toEqual({});
  });
  it('casting in the rain stops, damp air minds filament, a calm night flies, the panel waits for noon', () => {
    const a = Object.fromEntries(forMaking(lagos).map((x) => [x.what, x]));
    expect(STEAM_EXPANSION).toBeGreaterThan(1590); expect(STEAM_EXPANSION).toBeLessThan(1610);
    expect(a.Casting!.level).toBe('stop'); expect(a.Casting!.says).toMatch(/raining \(0\.1 mm/); expect(a.Casting!.says).toMatch(/1600 times/);
    expect(a.Filament!.level).toBe('mind');
    expect(a['Flying a drone']!.level).toBe('ok'); expect(DRONE_WIND).toBe(10.7);
    // noon's 684 W/m² on 1.63 m² at 20 %: about 223 W
    expect(a['A solar panel']!.says).toMatch(/gives about 0 W\. The best hour ahead is 12:00 at 684 W\/m²: about 223 W/);
  });
});

describe('as pipeline steps', () => {
  it('"weather …" and Claude\'s own verbs are actions of the room; a rule starts on a number of the weather', () => {
    expect(guessStep('weather in Leeds')).toEqual({ kind: 'action', what: 'weather in leeds' });
    expect(guessStep('weather making')?.kind).toBe('action');
    for (const w of ['claude practise', 'claude rest', 'claude feel', 'claude lessons']) expect(guessStep(w)?.kind, w).toBe('action');
    expect(guessStep('claude explain the weight')?.kind).toBe('ai');
    expect(guessStep('when outside_rain_chance > 70')?.kind).toBe('trigger'); expect(triggerOf('when outside_gusts > 10.7')).toBeTruthy();
  });
});

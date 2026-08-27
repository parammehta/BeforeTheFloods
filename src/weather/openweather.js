/**
 * OpenWeatherMap client.
 *
 * The 2017 build hand-rolled Kelvin → C/F arithmetic because it never passed
 * `units`. We request metric and convert to Fahrenheit locally, so flipping the
 * unit toggle costs no extra API calls.
 *
 * Endpoints used (all on the free tier):
 *   /data/2.5/weather   current conditions
 *   /data/2.5/forecast  5 day / 3 hour forecast
 *   /geo/1.0/direct     place name → coordinates (fallback geocoder)
 */

const KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const ROOT = 'https://api.openweathermap.org';

export const hasOpenWeatherKey = Boolean(KEY);

export class WeatherError extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.name = 'WeatherError';
    this.status = status;
  }
}

async function request(path, params) {
  if (!KEY) {
    throw new WeatherError(
      'No OpenWeatherMap API key configured. Set VITE_OPENWEATHER_API_KEY.',
    );
  }

  const url = new URL(path, ROOT);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('appid', KEY);

  const response = await fetch(url);

  if (!response.ok) {
    // 401 is what a dead or unactivated key returns — worth naming, because a
    // brand new key takes a couple of hours to start working.
    const message =
      response.status === 401
        ? 'OpenWeatherMap rejected the API key (401). A newly created key can ' +
          'take a couple of hours to activate.'
        : `OpenWeatherMap request failed (${response.status}).`;
    throw new WeatherError(message, { status: response.status });
  }

  return response.json();
}

/** @returns {Promise<{name: string, country: string, lat: number, lon: number}[]>} */
export async function geocode(query) {
  const results = await request('/geo/1.0/direct', { q: query, limit: '5' });
  return results.map((r) => ({
    name: r.name,
    country: r.country,
    state: r.state,
    lat: r.lat,
    lon: r.lon,
  }));
}

export function getCurrent(lat, lon) {
  return request('/data/2.5/weather', { lat, lon, units: 'metric' });
}

export function getForecast(lat, lon) {
  return request('/data/2.5/forecast', { lat, lon, units: 'metric' });
}

export const toFahrenheit = (celsius) => (celsius * 9) / 5 + 32;

/** @param {number} celsius @param {'C'|'F'} unit */
export const inUnit = (celsius, unit) =>
  unit === 'F' ? toFahrenheit(celsius) : celsius;

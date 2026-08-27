/**
 * Weather section: city picker → current conditions + 5 day forecast.
 *
 * Structurally different from the 2017 version in one important way: nothing
 * else on the page depends on this succeeding. It used to be the gate that
 * un-hid every other section, so a dead API key blanked the whole site.
 */

import { createForecastChart } from '../charts/forecast-chart.js';
import { mountPlaceSearch } from './place-search.js';
import { getCurrent, getForecast, hasOpenWeatherKey, inUnit } from './openweather.js';

const DEFAULT_PLACE = { name: 'Delhi, IN', lat: 28.6139, lon: 77.209 };
const STORAGE_KEY = 'btf:last-place';

const METRICS = [
  { id: 'temp', label: 'Temperature', icon: 'temperature', unit: true },
  { id: 'temp_min', label: 'Min', icon: 'minTemperature', unit: true },
  { id: 'temp_max', label: 'Max', icon: 'maxTemperature', unit: true },
  { id: 'pressure', label: 'Pressure', icon: 'pressure', suffix: ' hPa' },
  { id: 'humidity', label: 'Humidity', icon: 'humidity', suffix: '%' },
  { id: 'wind', label: 'Wind', icon: 'wind', suffix: ' m/s' },
];

function readStoredPlace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storePlace(place) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
  } catch {
    /* Private browsing; the default city is a fine fallback. */
  }
}

export async function initWeather(root) {
  const searchSlot = root.querySelector('[data-place-search]');
  const status = root.querySelector('[data-weather-status]');
  const panel = root.querySelector('[data-weather-panel]');
  const cityLabel = root.querySelector('[data-weather-city]');
  const summary = root.querySelector('[data-weather-summary]');
  const grid = root.querySelector('[data-weather-metrics]');
  const chartSlot = root.querySelector('[data-forecast-chart]');
  const unitToggle = root.querySelector('[data-unit-toggle]');

  if (!hasOpenWeatherKey) {
    status.hidden = false;
    status.className = 'notice notice--warn';
    status.innerHTML = `
      <strong>Live weather is switched off.</strong>
      Set <code>VITE_OPENWEATHER_API_KEY</code> in <code>.env</code> and rebuild
      to enable the city search and forecast. Every other section on this page
      works without it.`;
    searchSlot.hidden = true;
    return;
  }

  const chart = createForecastChart(chartSlot);

  let unit = /** @type {'C'|'F'} */ (localStorage.getItem('btf:unit') === 'F' ? 'F' : 'C');
  let current = null;
  let forecast = null;

  function paint() {
    if (!current || !forecast) return;

    cityLabel.textContent = current.name
      ? `${current.name}${current.sys?.country ? `, ${current.sys.country}` : ''}`
      : '';

    const weather = current.weather[0];
    summary.textContent = weather
      ? `${weather.main} — ${weather.description}`
      : '';

    const values = {
      temp: current.main.temp,
      temp_min: current.main.temp_min,
      temp_max: current.main.temp_max,
      pressure: current.main.pressure,
      humidity: current.main.humidity,
      wind: current.wind?.speed ?? 0,
    };

    grid.replaceChildren(
      ...METRICS.map((metric) => {
        const value = values[metric.id];
        const text = metric.unit
          ? `${inUnit(value, unit).toFixed(1)}°${unit}`
          : `${Math.round(value)}${metric.suffix ?? ''}`;

        const cell = document.createElement('div');
        cell.className = 'metric';
        cell.innerHTML = `
          <img class="metric__icon" src="${import.meta.env.BASE_URL}icons/${metric.icon}.svg" alt="" width="32" height="32">
          <div class="metric__value">${text}</div>
          <div class="metric__label">${metric.label}</div>`;
        return cell;
      }),
    );

    chart.render(forecast, unit);
    panel.hidden = false;
  }

  async function show(place) {
    status.hidden = false;
    status.className = 'notice';
    status.textContent = `Loading weather for ${place.name}…`;

    try {
      [current, forecast] = await Promise.all([
        getCurrent(place.lat, place.lon),
        getForecast(place.lat, place.lon),
      ]);
      // OWM's own city name beats the geocoder's for display.
      current.name ||= place.name;
      status.hidden = true;
      storePlace(place);
      paint();
    } catch (error) {
      panel.hidden = true;
      status.hidden = false;
      status.className = 'notice notice--error';
      status.textContent = error.message;
    }
  }

  unitToggle?.addEventListener('click', () => {
    unit = unit === 'C' ? 'F' : 'C';
    localStorage.setItem('btf:unit', unit);
    unitToggle.textContent = `Show °${unit === 'C' ? 'F' : 'C'}`;
    paint();
  });
  if (unitToggle) unitToggle.textContent = `Show °${unit === 'C' ? 'F' : 'C'}`;

  await mountPlaceSearch(searchSlot, show);
  await show(readStoredPlace() ?? DEFAULT_PLACE);
}

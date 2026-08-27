/**
 * City picker.
 *
 * Two implementations behind one interface:
 *
 *   1. Google Places `PlaceAutocompleteElement`, if VITE_GOOGLE_MAPS_API_KEY is
 *      set. Note this is *not* the `google.maps.places.Autocomplete` the 2017
 *      build used — that class was closed to new customers in March 2025, so a
 *      freshly issued key cannot construct it.
 *   2. Otherwise a plain input backed by OpenWeatherMap's own /geo/1.0/direct
 *      geocoder, which needs no extra key. The section stays usable with only
 *      the weather key configured.
 *
 * Both call `onSelect({ name, lat, lon })`.
 */

import { geocode } from './openweather.js';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const hasGoogleKey = Boolean(MAPS_KEY);

/* --------------------------------------------------------------- Google API */

let mapsPromise;

/**
 * Load the Maps JS API on demand. Deliberately not a <script> in index.html:
 * most visitors never reach the weather section, and this keeps Google off the
 * critical path (and out of the request log) until they do.
 */
function loadGoogleMaps() {
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) {
      resolve(window.google.maps);
      return;
    }

    const script = document.createElement('script');
    const params = new URLSearchParams({
      key: MAPS_KEY,
      v: 'weekly',
      libraries: 'places',
      loading: 'async',
      callback: '__initGoogleMaps',
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;

    window.__initGoogleMaps = () => resolve(window.google.maps);
    script.onerror = () =>
      reject(new Error('Could not load the Google Maps JavaScript API.'));

    document.head.append(script);
  });

  return mapsPromise;
}

async function mountGoogle(container, onSelect) {
  const maps = await loadGoogleMaps();
  const { PlaceAutocompleteElement } = await maps.importLibrary('places');

  const element = new PlaceAutocompleteElement({ types: ['(cities)'] });
  element.id = 'city-search';
  element.className = 'weather__search';
  container.replaceChildren(element);

  // The event was renamed from `gmp-placeselect` to `gmp-select` during the
  // Places (New) rollout; listen for both so either SDK build works.
  const handler = async (event) => {
    const prediction = event.placePrediction ?? event.detail?.placePrediction;
    if (!prediction) return;

    const place = prediction.toPlace();
    await place.fetchFields({ fields: ['location', 'displayName', 'formattedAddress'] });

    onSelect({
      name: place.displayName ?? place.formattedAddress,
      lat: place.location.lat(),
      lon: place.location.lng(),
    });
  };

  element.addEventListener('gmp-select', handler);
  element.addEventListener('gmp-placeselect', handler);
}

/* ------------------------------------------------------- OpenWeatherMap geo */

function mountFallback(container, onSelect) {
  container.replaceChildren();

  const form = document.createElement('form');
  form.className = 'weather__search-form';
  form.innerHTML = `
    <label class="visually-hidden" for="city-search">Search for a city</label>
    <input id="city-search" class="weather__search" type="search"
           placeholder="Search for a city…" autocomplete="off" enterkeyhint="search">
    <button class="button" type="submit">Search</button>
  `;

  const results = document.createElement('ul');
  results.className = 'weather__results';
  results.hidden = true;

  container.append(form, results);
  const input = form.querySelector('input');

  function close() {
    results.hidden = true;
    results.replaceChildren();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    try {
      const matches = await geocode(query);
      if (!matches.length) {
        results.hidden = false;
        results.innerHTML = '<li class="weather__result is-empty">No matching city.</li>';
        return;
      }

      results.hidden = false;
      results.replaceChildren(
        ...matches.map((match) => {
          const item = document.createElement('li');
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'weather__result';
          button.textContent = [match.name, match.state, match.country]
            .filter(Boolean)
            .join(', ');
          button.addEventListener('click', () => {
            input.value = button.textContent;
            close();
            onSelect({ name: button.textContent, lat: match.lat, lon: match.lon });
          });
          item.append(button);
          return item;
        }),
      );
    } catch (error) {
      results.hidden = false;
      results.innerHTML = `<li class="weather__result is-empty">${error.message}</li>`;
    }
  });

  input.addEventListener('input', () => {
    if (!input.value) close();
  });
}

/**
 * @param {HTMLElement} container
 * @param {(place: {name: string, lat: number, lon: number}) => void} onSelect
 */
export async function mountPlaceSearch(container, onSelect) {
  if (!hasGoogleKey) {
    mountFallback(container, onSelect);
    return 'openweather';
  }

  try {
    await mountGoogle(container, onSelect);
    return 'google';
  } catch (error) {
    // A blocked, unbilled or referrer-restricted key should degrade, not break.
    console.warn('[weather] Google Places unavailable, falling back', error);
    mountFallback(container, onSelect);
    return 'openweather';
  }
}

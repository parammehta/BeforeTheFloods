# Before the Floods

An interactive visual story about CO₂ emissions, air pollution, and land use —
originally built in 2017 with AngularJS and d3 v3/v4, rebuilt in 2026 as a
static Vite + d3 v7 site.

## Sections

- **Weather** — live current conditions and a 5-day forecast for any city
  (needs an OpenWeatherMap key; degrades cleanly to a notice without one).
- **Pollution index** — mean annual PM2.5 exposure by country. World Bank.
- **CO₂** — a circle pack of emissions by country or by source sector. Our
  World in Data.
- **Carbon budget** — an animated timeline of historical emissions against
  the 2°C carbon budget, with IPCC RCP scenario playback.
- **Forest & farmland** — a world choropleth toggling between forest and
  agricultural land share. World Bank.

## Developing

```bash
npm install
npm run dev
```

Live weather needs two optional keys — copy `.env.example` to `.env` and
fill them in:

```bash
cp .env.example .env
```

- `VITE_OPENWEATHER_API_KEY` — free tier, no card required, at
  [openweathermap.org/api](https://home.openweathermap.org/api_keys). A new
  key can take a couple of hours to activate.
- `VITE_GOOGLE_MAPS_API_KEY` — enables the Google Places city search. Without
  it, city search falls back to OpenWeatherMap's own geocoder, so weather
  works with only the one key. If you do set this, restrict it by HTTP
  referrer to your deployed domain — this is a static site, so the key ships
  in the client bundle regardless.

Both are read at *build* time (`import.meta.env.VITE_*`), not injected at
runtime — a key change needs a rebuild.

## Data

Everything in `public/data/` is generated, not hand-edited:

```bash
npm run fetch-data
```

pulls current figures from the World Bank Indicators API and the
[Our World in Data CO₂ dataset](https://github.com/owid/co2-data), and writes
`public/data/coverage.json` recording what year range each file covers. The
IPCC RCP emissions-scenario projections cannot be re-fetched from a live API;
they're carried over from the original 2017 WRI CAIT release and trimmed to
start after the latest observed year. See `scripts/fetch-data.mjs` for the
exact provenance of every column.

A GitHub Action (`.github/workflows/refresh-data.yml`) runs this monthly and
opens a PR with whatever changed.

## Deploying

Pushing to `main` builds and deploys to GitHub Pages via
`.github/workflows/deploy.yml`. To deploy elsewhere, `npm run build` and serve
`dist/` — set `BASE_PATH=/` at build time if you're not hosting under a
`/BeforeTheFloods/` subpath (see `vite.config.js`).

## What changed from 2017

The original AngularJS build, its data, and its bower-managed vendor tree are
preserved in git history. The rebuild:

- Replaces AngularJS + jQuery + Bootstrap 3 + bower with plain ES modules and
  Vite.
- Ports every chart from d3 v3/v4 to v7 (`src/charts/*.js` document the
  specific API and behavioural fixes made during each port).
- Removes the weather-API gate that used to hide every other section on the
  page if OpenWeatherMap's key was down.
- Replaces the dead, unrestricted Google Maps key with build-time env vars
  and a working fallback path.
- Regenerates the dataset from live sources instead of shipping a decade-old
  static export.

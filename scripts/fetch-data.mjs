#!/usr/bin/env node
/**
 * Regenerate everything in public/data from upstream sources.
 *
 *   node scripts/fetch-data.mjs
 *
 * The 2017 build shipped hand-exported spreadsheets with no record of where
 * they came from or how to refresh them, which is why the site was still
 * showing 2013 numbers a decade later. This script is the record.
 *
 * Sources
 *   World Bank Indicators API  https://api.worldbank.org/v2   (no key)
 *   Our World in Data CO₂      https://github.com/owid/co2-data (CC BY)
 *
 * The IPCC RCP scenario projections cannot be re-fetched — they are carried
 * over from the original file (see RCP_SOURCE) and trimmed so they start after
 * the last year of observed data.
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { csvParse, csvFormat } from 'd3-dsv';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'data');
const RCP_SOURCE = join(ROOT, 'vendor', 'greenhousegas-rcp-2017.csv');

const WB = 'https://api.worldbank.org/v2';
const OWID = 'https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv';

const FIRST_YEAR = 1850;
const PM25_FIRST_YEAR = 1990;
const CO2_BUBBLE_FIRST_YEAR = 1990;

const log = (...args) => console.log('•', ...args);

/* ------------------------------------------------------------------ utils */

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

async function getText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

/**
 * The World Bank mixes real countries and aggregates ("Arab World", "OECD
 * members") into `country/all`. Aggregates are the ones whose region is "NA".
 */
async function realCountryCodes() {
  const [, rows] = await getJSON(`${WB}/country?format=json&per_page=400`);
  return new Set(rows.filter((r) => r.region?.id !== 'NA').map((r) => r.id));
}

/** Fetch one indicator, paging until exhausted. */
async function indicator(id, { from, to }) {
  const perPage = 20000;
  const first = await getJSON(
    `${WB}/country/all/indicator/${id}?format=json&per_page=${perPage}&date=${from}:${to}`,
  );

  const [meta] = first;
  let rows = first[1] ?? [];

  for (let page = 2; page <= meta.pages; page++) {
    const next = await getJSON(
      `${WB}/country/all/indicator/${id}?format=json&per_page=${perPage}&date=${from}:${to}&page=${page}`,
    );
    rows = rows.concat(next[1] ?? []);
  }

  log(`world bank ${id}: ${rows.length} observations (updated ${meta.lastupdated})`);
  return rows;
}

/* ------------------------------------------------------- 1. PM2.5 exposure */

async function buildPm25(countries) {
  const rows = await indicator('EN.ATM.PM25.MC.M3', {
    from: PM25_FIRST_YEAR,
    to: new Date().getFullYear(),
  });

  const byCountry = new Map();
  const years = new Set();

  for (const row of rows) {
    if (!countries.has(row.countryiso3code)) continue;
    if (row.value == null) continue;

    years.add(row.date);
    if (!byCountry.has(row.countryiso3code)) {
      byCountry.set(row.countryiso3code, {
        Country_Name: row.country.value,
        Country_Code: row.countryiso3code,
      });
    }
    byCountry.get(row.countryiso3code)[row.date] = row.value;
  }

  const sortedYears = [...years].sort();
  const columns = ['Country_Name', 'Country_Code', ...sortedYears];

  const out = [...byCountry.values()]
    // The chart needs at least two points to draw a line.
    .filter((row) => sortedYears.filter((y) => row[y] != null).length > 1)
    .sort((a, b) => a.Country_Name.localeCompare(b.Country_Name));

  await writeFile(join(OUT, 'pm25-over-time.csv'), csvFormat(out, columns));
  log(`pm25-over-time.csv: ${out.length} countries, ${sortedYears[0]}–${sortedYears.at(-1)}`);
  return { first: sortedYears[0], last: sortedYears.at(-1) };
}

/* --------------------------------------------------- 2. forest / farmland */

async function buildForest(countries) {
  const thisYear = new Date().getFullYear();
  const [forest, agri] = await Promise.all([
    indicator('AG.LND.FRST.ZS', { from: 2000, to: thisYear }),
    indicator('AG.LND.AGRI.ZS', { from: 2000, to: thisYear }),
  ]);

  /** Most recent non-null observation per country. */
  function latest(rows) {
    const best = new Map();
    for (const row of rows) {
      if (!countries.has(row.countryiso3code) || row.value == null) continue;
      const existing = best.get(row.countryiso3code);
      if (!existing || +row.date > +existing.date) best.set(row.countryiso3code, row);
    }
    return best;
  }

  const latestForest = latest(forest);
  const latestAgri = latest(agri);

  const out = [...latestForest.keys()]
    .filter((code) => latestAgri.has(code))
    .sort()
    .map((code) => ({
      code,
      name: latestForest.get(code).country.value,
      forest: +latestForest.get(code).value.toFixed(2),
      agri: +latestAgri.get(code).value.toFixed(2),
      year: latestForest.get(code).date,
    }));

  await writeFile(join(OUT, 'forest.csv'), csvFormat(out, ['code', 'name', 'agri', 'forest', 'year']));
  const years = out.map((r) => +r.year);
  log(`forest.csv: ${out.length} countries, observations ${Math.min(...years)}–${Math.max(...years)}`);
  return { last: Math.max(...years) };
}

/* ------------------------------------------------------------- 3-5. OWID */

/** Keep real countries: a 3-letter ISO code, and not an OWID_* aggregate. */
const isCountry = (row) => /^[A-Z]{3}$/.test(row.iso_code ?? '');

async function buildFromOwid() {
  log('downloading OWID co2-data.csv …');
  const all = csvParse(await getText(OWID));
  log(`owid: ${all.length} rows, ${new Set(all.map((r) => r.country)).size} entities`);

  const countryRows = all.filter(isCountry);
  const worldRows = all.filter((r) => r.country === 'World');

  const lastYear = Math.max(
    ...countryRows.filter((r) => r.co2 !== '').map((r) => +r.year),
  );
  log(`owid: observed emissions run to ${lastYear}`);

  await buildCo2ByCountry(countryRows, lastYear);
  await buildCo2BySource(worldRows, lastYear);
  await buildGreenhouseGas(countryRows, worldRows, lastYear);

  return { last: lastYear };
}

/* CO₂ by country, wide — one row per year, one column per country (Mt). */
async function buildCo2ByCountry(rows, lastYear) {
  const byYear = new Map();
  const names = new Set();

  for (const row of rows) {
    const year = +row.year;
    if (year < CO2_BUBBLE_FIRST_YEAR || year > lastYear) continue;
    if (row.co2 === '' || row.co2 == null) continue;

    if (!byYear.has(year)) byYear.set(year, { Year: year });
    byYear.get(year)[row.country] = +(+row.co2).toFixed(2);
    names.add(row.country);
  }

  const columns = ['Year', ...[...names].sort()];
  const out = [...byYear.values()].sort((a, b) => a.Year - b.Year);

  await writeFile(join(OUT, 'co2-by-country.csv'), csvFormat(out, columns));
  log(`co2-by-country.csv: ${out.length} years × ${names.size} countries`);
}

/* CO₂ by source sector, World only (Mt). */
async function buildCo2BySource(worldRows, lastYear) {
  const SOURCES = {
    Coal: 'coal_co2',
    Oil: 'oil_co2',
    Gas: 'gas_co2',
    Cement: 'cement_co2',
    Flaring: 'flaring_co2',
    Other: 'other_industry_co2',
  };

  const out = worldRows
    .filter((r) => +r.year >= CO2_BUBBLE_FIRST_YEAR && +r.year <= lastYear)
    .map((row) => {
      const record = { Year: +row.year };
      for (const [label, column] of Object.entries(SOURCES)) {
        const value = row[column];
        if (value !== '' && value != null) record[label] = +(+value).toFixed(2);
      }
      return record;
    })
    .filter((record) => Object.keys(record).length > 1)
    .sort((a, b) => a.Year - b.Year);

  await writeFile(
    join(OUT, 'co2-by-source.csv'),
    csvFormat(out, ['Year', ...Object.keys(SOURCES)]),
  );
  log(`co2-by-source.csv: ${out.length} years`);
}

/* Historical emissions + the carried-over RCP projections. */
async function buildGreenhouseGas(countryRows, worldRows, lastYear) {
  const COLUMNS = [
    'Country name',
    'Alpha-3',
    'Year',
    'Emissions excluding land use (Mt CO2)',
    'Emissions from land use (Mt CO2)',
    'RCP3PD',
    'RCP4.5',
    'RCP6',
    'RCP8.5',
  ];

  const toRecord = (row) => ({
    'Country name': row.country,
    'Alpha-3': row.iso_code,
    Year: +row.year,
    'Emissions excluding land use (Mt CO2)': row.co2 === '' ? '' : +(+row.co2).toFixed(4),
    'Emissions from land use (Mt CO2)':
      row.land_use_change_co2 === '' ? '' : +(+row.land_use_change_co2).toFixed(4),
    RCP3PD: '',
    'RCP4.5': '',
    RCP6: '',
    'RCP8.5': '',
  });

  const history = [...countryRows, ...worldRows.map((r) => ({ ...r, iso_code: 'WLD' }))]
    .filter((r) => +r.year >= FIRST_YEAR && +r.year <= lastYear)
    .filter((r) => r.co2 !== '' || r.land_use_change_co2 !== '')
    .map(toRecord);

  /* IPCC RCP scenarios: not re-fetchable, carried over verbatim. Rows that
     now overlap the observed record are dropped, otherwise the cumulative
     totals would count those years twice. */
  const original = csvParse(await readFile(RCP_SOURCE, 'utf8'));
  const projections = original
    .filter((r) => r['RCP8.5'] !== '' && r['RCP8.5'] != null)
    .filter((r) => +r.Year > lastYear)
    .map((r) => ({
      'Country name': 'World',
      'Alpha-3': 'WLD',
      Year: +r.Year,
      'Emissions excluding land use (Mt CO2)': '',
      'Emissions from land use (Mt CO2)': '',
      RCP3PD: r.RCP3PD,
      'RCP4.5': r['RCP4.5'],
      RCP6: r.RCP6,
      'RCP8.5': r['RCP8.5'],
    }));

  const out = [...history, ...projections].sort(
    (a, b) => a.Year - b.Year || a['Country name'].localeCompare(b['Country name']),
  );

  await writeFile(join(OUT, 'greenhouse-gas.csv'), csvFormat(out, COLUMNS));
  log(
    `greenhouse-gas.csv: ${history.length} observed rows to ${lastYear}, ` +
      `${projections.length} projected rows to ${Math.max(...projections.map((r) => r.Year))}`,
  );
}

/* -------------------------------------------------------------------- run */

const started = Date.now();
await mkdir(OUT, { recursive: true });

const countries = await realCountryCodes();
log(`world bank: ${countries.size} countries (aggregates excluded)`);

const pm25 = await buildPm25(countries);
const forest = await buildForest(countries);
const owid = await buildFromOwid();

await writeFile(
  join(OUT, 'coverage.json'),
  `${JSON.stringify(
    {
      generated: new Date().toISOString().slice(0, 10),
      pm25: { first: +pm25.first, last: +pm25.last },
      forest: { last: forest.last },
      emissions: { last: owid.last },
    },
    null,
    2,
  )}\n`,
);

log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);

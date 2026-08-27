/**
 * PM2.5 mean annual exposure, per country. Source: The World Bank. The year
 * range is whatever scripts/fetch-data.mjs last pulled — see coverage.json —
 * not a value baked in here.
 *
 * Ported from the d3 v3 `pollutionIndex` directive. Two bugs came across with
 * it and are fixed here:
 *
 *   1. The original walked every CSV column that was not named `Country` and
 *      fed it to a `%Y` parser, so `Country_Code`, `Type` and `Indicator Name`
 *      became points at date `null`. Only real four digit year columns are
 *      read now.
 *   2. It labelled series from `d.Country_Name` while excluding the column
 *      `Country`, which does not exist in this file — the label accessor and
 *      the column filter disagreed. Both use `Country_Name` now.
 */

import { axisBottom, axisLeft } from 'd3-axis';
import { csv } from 'd3-fetch';
import { scaleLinear, scaleTime } from 'd3-scale';
import { pointer, select } from 'd3-selection';
import { line } from 'd3-shape';
import { extent, max } from 'd3-array';

import { DATA_BASE } from '../lib/paths.js';

const MARGIN = { top: 24, right: 168, bottom: 32, left: 48 };
const WIDTH = 1024;
const HEIGHT = 520;

const YEAR_COLUMN = /^\d{4}$/;

/**
 * @param {import('d3-dsv').DSVRowArray} rows
 * @returns {{ country: string, points: Array<{ year: Date, value: number }> }[]}
 */
function toSeries(rows) {
  const years = rows.columns.filter((column) => YEAR_COLUMN.test(column));

  return rows
    .map((row) => ({
      country: row.Country_Name,
      points: years
        .map((year) => ({ year: new Date(Number(year), 0, 1), value: Number(row[year]) }))
        // 0 is the World Bank's "no observation" filler in this extract, not a
        // real reading of zero micrograms.
        .filter((point) => Number.isFinite(point.value) && point.value > 0),
    }))
    .filter((series) => series.country && series.points.length > 1);
}

export async function renderPollutionIndex(container) {
  const rows = await csv(`${DATA_BASE}/pm25-over-time.csv`);
  const series = toSeries(rows);

  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = scaleTime()
    .domain(extent(series.flatMap((s) => s.points.map((p) => p.year))))
    .range([0, innerWidth]);

  const y = scaleLinear()
    .domain([0, max(series, (s) => max(s.points, (p) => p.value))])
    .nice()
    .range([innerHeight, 0]);

  const path = line()
    .x((d) => x(d.year))
    .y((d) => y(d.value));

  const root = select(container).selectAll('svg').data([null]).join('svg');
  root
    .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
    .attr('class', 'chart chart--lines')
    .attr('role', 'img')
    .attr('aria-label',
      'Line chart of mean annual PM2.5 exposure by country from 1990 to 2013. ' +
      'Hover a line to highlight one country.');

  root.selectAll('*').remove();
  const g = root.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  g.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(axisBottom(x).ticks(8));

  g.append('g')
    .attr('class', 'axis axis--y')
    .call(axisLeft(y).ticks(6))
    .append('text')
    .attr('class', 'axis__title')
    .attr('transform', 'rotate(-90)')
    .attr('y', -36)
    .attr('x', -innerHeight / 2)
    .attr('text-anchor', 'middle')
    .text('µg per m³');

  /* Every series, drawn faintly. */
  const lines = g
    .append('g')
    .attr('class', 'lines')
    .selectAll('path')
    .data(series)
    .join('path')
    .attr('class', 'line')
    .attr('d', (d) => path(d.points));

  /* The label that follows the highlighted series. */
  const label = g
    .append('text')
    .attr('class', 'line__label')
    .attr('x', innerWidth + 8)
    .attr('dy', '0.32em')
    .style('opacity', 0);

  /* Countries the reader has pinned by clicking. */
  const pinned = new Set();

  function paint() {
    lines.classed('is-pinned', (d) => pinned.has(d.country));
  }

  function highlight(datum) {
    lines.classed('is-active', (d) => d === datum);
    const last = datum.points.at(-1);
    label
      .attr('y', y(last.value))
      .text(`${datum.country} · ${last.value.toFixed(1)}`)
      .style('opacity', 1);
  }

  function clearHighlight() {
    lines.classed('is-active', false);
    label.style('opacity', 0);
  }

  lines
    .on('pointerenter', (_event, d) => highlight(d))
    .on('pointerleave', clearHighlight)
    .on('click', (_event, d) => {
      if (pinned.has(d.country)) pinned.delete(d.country);
      else pinned.add(d.country);
      paint();
    });

  /* Keyboard and touch users get a select instead of hover. */
  const picker = select(container)
    .selectAll('select.chart__picker')
    .data([null])
    .join('select')
    .attr('class', 'chart__picker')
    .attr('aria-label', 'Highlight a country');

  picker.selectAll('option').remove();
  picker.append('option').attr('value', '').text('Highlight a country…');
  picker
    .selectAll('option.country')
    .data(series.map((s) => s.country).sort((a, b) => a.localeCompare(b)))
    .join('option')
    .attr('class', 'country')
    .attr('value', (d) => d)
    .text((d) => d);

  picker.on('change', function () {
    const match = series.find((s) => s.country === this.value);
    if (match) highlight(match);
    else clearHighlight();
  });

  const allYears = series.flatMap((s) => s.points.map((p) => p.year.getFullYear()));

  /* Nearest-line hover across the whole plot, so thin lines are still catchable. */
  g.append('rect')
    .attr('class', 'chart__surface')
    .attr('width', innerWidth)
    .attr('height', innerHeight)
    .on('pointermove', (event) => {
      const [mx, my] = pointer(event);
      const year = x.invert(mx);
      let best = null;
      let bestDistance = Infinity;

      for (const s of series) {
        const point = s.points.reduce((a, b) =>
          Math.abs(b.year - year) < Math.abs(a.year - year) ? b : a,
        );
        const distance = Math.abs(y(point.value) - my);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = s;
        }
      }

      if (best && bestDistance < 24) highlight(best);
      else clearHighlight();
    })
    .on('pointerleave', clearHighlight);

  return { first: Math.min(...allYears), last: Math.max(...allYears) };
}

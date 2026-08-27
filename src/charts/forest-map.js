/**
 * World choropleth of forest vs agricultural land, as a share of land area.
 * Hovering a country draws a donut of forest / agriculture / other.
 *
 * Ported from the d3 v4 `forestData` directive. Fixes made during the port:
 *   - `d3.csv(url, callback)` and `d3.json(url, callback)` stopped taking
 *     callbacks in d3 v5; they return promises. The original would simply
 *     never have drawn under v5+.
 *   - The colour domains were built with `d3.max(csv, d => d.agri)` on
 *     *unparsed strings*, so the max was lexicographic ("9.9" > "58.07") and
 *     the ramp was wrong. Values are coerced to numbers first.
 *   - Mode was tracked by reading the caption's text back out of the DOM and
 *     string-comparing it. It is a variable now.
 *   - The click handler was bound to both the `<svg>` and every `<path>`, so
 *     clicking a country toggled the mode twice and appeared to do nothing.
 *   - The hover loop assigned to the outer `i`, clobbering the join index.
 */

import { csv, json } from 'd3-fetch';
import { geoMercator, geoPath } from 'd3-geo';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import 'd3-transition';
import { arc, pie } from 'd3-shape';
import { max } from 'd3-array';

import { DATA_BASE } from '../lib/paths.js';

const WIDTH = 960;
const HEIGHT = 500;

const MODES = {
  forest: {
    key: 'forest',
    label: 'Forest area (% of total land area)',
    range: ['#f2f7f2', '#14532d'],
  },
  agri: {
    key: 'agri',
    label: 'Agricultural area (% of total land area)',
    range: ['#faf6ec', '#78350f'],
  },
};

const NO_DATA = '#d8d8d8';

export async function renderForestMap(container, { caption, toggle } = {}) {
  const [rows, world] = await Promise.all([
    csv(`${DATA_BASE}/forest.csv`, (d) => ({
      code: d.code,
      agri: Number(d.agri),
      forest: Number(d.forest),
    })),
    json(`${DATA_BASE}/countries.json`),
  ]);

  /* Index by ISO alpha-3 rather than the original O(n·m) nested scan. */
  const byCode = new Map(rows.map((d) => [d.code, d]));
  for (const feature of world.features) {
    const match = byCode.get(feature.id);
    feature.properties.agri = match?.agri ?? null;
    feature.properties.forest = match?.forest ?? null;
  }

  const scales = {
    forest: scaleLinear()
      .domain([0, max(rows, (d) => d.forest)])
      .range(MODES.forest.range),
    agri: scaleLinear()
      .domain([0, max(rows, (d) => d.agri)])
      .range(MODES.agri.range),
  };

  const svg = select(container)
    .selectAll('svg')
    .data([null])
    .join('svg')
    .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
    .attr('class', 'chart chart--map')
    .attr('role', 'img');

  svg.selectAll('*').remove();

  const path = geoPath().projection(
    geoMercator()
      .translate([WIDTH / 2, (HEIGHT + 130) / 2])
      .scale(140),
  );

  let mode = MODES.forest;

  const countries = svg
    .append('g')
    .attr('class', 'map__countries')
    .selectAll('path')
    .data(world.features)
    .join('path')
    .attr('d', path)
    .attr('class', 'map__country');

  countries.append('title');

  const overlay = svg.append('g').attr('class', 'map__overlay');
  const legend = svg.append('g').attr('class', 'map__legend');

  const donutArc = arc().innerRadius(26).outerRadius(52).padAngle(0.04);
  const donutPie = pie()
    .sort(null)
    .value((d) => d.value);

  function paint() {
    const scale = scales[mode.key];

    countries
      .transition()
      .duration(400)
      .attr('fill', (d) => {
        const value = d.properties[mode.key];
        return value == null ? NO_DATA : scale(value);
      });

    countries.select('title').text((d) => {
      const value = d.properties[mode.key];
      return value == null
        ? `${d.properties.name}: no data`
        : `${d.properties.name}: ${value.toFixed(1)}% ${mode.key === 'forest' ? 'forest' : 'agricultural'}`;
    });

    if (caption) caption.textContent = mode.label;
    if (toggle) {
      toggle.textContent =
        mode.key === 'forest' ? 'Show agricultural land' : 'Show forest cover';
      toggle.setAttribute('aria-pressed', String(mode.key === 'agri'));
    }

    svg.attr('aria-label', `World map shaded by ${mode.label}.`);
    drawLegend(scale);
  }

  function drawLegend(scale) {
    const steps = 6;
    const [, hi] = scale.domain();
    const box = 22;
    const x0 = WIDTH - box * (steps + 1) - 16;
    const y0 = HEIGHT - 46;

    legend.selectAll('*').remove();

    legend
      .selectAll('rect')
      .data(Array.from({ length: steps }, (_, i) => (hi * i) / (steps - 1)))
      .join('rect')
      .attr('x', (_, i) => x0 + i * box)
      .attr('y', y0)
      .attr('width', box)
      .attr('height', 14)
      .attr('fill', (d) => scale(d));

    legend
      .append('text')
      .attr('class', 'map__legend-label')
      .attr('x', x0)
      .attr('y', y0 - 6)
      .text('0%');

    legend
      .append('text')
      .attr('class', 'map__legend-label')
      .attr('x', x0 + steps * box)
      .attr('y', y0 - 6)
      .attr('text-anchor', 'end')
      .text(`${Math.round(hi)}%`);
  }

  function showDonut(feature) {
    const { forest, agri, name } = feature.properties;
    if (forest == null && agri == null) return;

    const other = Math.max(0, 100 - (forest ?? 0) - (agri ?? 0));
    const slices = donutPie([
      { label: 'Forest', value: forest ?? 0, fill: '#166534' },
      { label: 'Agriculture', value: agri ?? 0, fill: '#d97706' },
      { label: 'Other', value: other, fill: '#c2c2c2' },
    ]);

    const x = 90;
    const y = HEIGHT - 90;

    overlay.selectAll('*').remove();

    overlay
      .append('text')
      .attr('class', 'map__donut-title')
      .attr('x', x)
      .attr('y', y - 66)
      .attr('text-anchor', 'middle')
      .text(name);

    overlay
      .append('g')
      .attr('transform', `translate(${x},${y})`)
      .selectAll('path')
      .data(slices)
      .join('path')
      .attr('d', donutArc)
      .attr('fill', (d) => d.data.fill)
      .append('title')
      .text((d) => `${d.data.label}: ${d.data.value.toFixed(1)}%`);
  }

  countries
    .on('pointerenter', (_event, d) => showDonut(d))
    .on('pointerleave', () => overlay.selectAll('*').remove());

  toggle?.addEventListener('click', () => {
    mode = mode.key === 'forest' ? MODES.agri : MODES.forest;
    paint();
  });

  paint();
}

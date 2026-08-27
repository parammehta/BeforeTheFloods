/**
 * CO₂ emissions as a circle pack, either by country or by source sector.
 *
 * Ported from the d3 v3 `bubbleChart` directive. The v3 `d3.layout.pack()`
 * took raw `{children: [...]}` and returned a flat node array; v4 split that
 * into `d3.hierarchy()` (structure + summing) and `d3.pack()` (layout).
 *
 * Fixes carried out during the port:
 *   - The original re-read the CSV and appended a *new* `<svg>` and a *new*
 *     tooltip `<div>` on every year change, stacking up charts and leaking
 *     tooltips. Data is fetched once and cached; the SVG is reused.
 *   - `d3.scale.category20c()` was removed in v4. Uses an ordinal scale over
 *     an interpolated ramp so the palette scales past 20 countries.
 *   - Values were divided by 1000 with no unit change in the label.
 */

import { csv } from 'd3-fetch';
import { hierarchy, pack } from 'd3-hierarchy';
import { scaleOrdinal, scaleSequential } from 'd3-scale';
import { interpolateSpectral } from 'd3-scale-chromatic';
import { select } from 'd3-selection';
import 'd3-transition';
import { format } from 'd3-format';

import { DATA_BASE } from '../lib/paths.js';

const SIZE = 720;
const SOURCES = {
  country: `${DATA_BASE}/co2-by-country.csv`,
  source: `${DATA_BASE}/co2-by-source.csv`,
};

const formatValue = format(',.1f');

/** @type {Map<string, Promise<import('d3-dsv').DSVRowArray>>} */
const cache = new Map();

function load(kind) {
  if (!cache.has(kind)) cache.set(kind, csv(SOURCES[kind]));
  return cache.get(kind);
}

/** Every year present in a source, ascending — drives the slider's bounds. */
export async function getAvailableYears(kind) {
  const rows = await load(kind);
  return rows.map((row) => Number(row.Year)).sort((a, b) => a - b);
}

/**
 * One CSV row (a year) becomes one hierarchy: every non-Year column is a leaf.
 * Values are already megatonnes (OWID `co2`); the 2017 file was kilotonnes and
 * the old code divided by 1000 without changing the label.
 */
function toHierarchy(row) {
  const children = Object.entries(row)
    .filter(([key]) => key !== 'Year')
    .map(([name, value]) => ({ name, value: Number(value) }))
    .filter((d) => Number.isFinite(d.value) && d.value > 0)
    .sort((a, b) => b.value - a.value);

  return { name: `CO₂ in ${row.Year}`, children };
}

export function createCo2Bubbles(container) {
  const svg = select(container)
    .selectAll('svg')
    .data([null])
    .join('svg')
    .attr('viewBox', `0 0 ${SIZE} ${SIZE}`)
    .attr('class', 'chart chart--bubbles')
    .attr('role', 'img');

  const tooltip = select(container)
    .selectAll('div.chart__tooltip')
    .data([null])
    .join('div')
    .attr('class', 'chart__tooltip')
    .attr('role', 'status')
    .style('opacity', 0);

  async function render({ year, kind }) {
    const rows = await load(kind);
    const row = rows.find((d) => Number(d.Year) === Number(year));
    if (!row) throw new Error(`no CO₂ data for ${year}`);

    const root = pack().size([SIZE, SIZE]).padding(3)(
      hierarchy(toHierarchy(row)).sum((d) => d.value),
    );

    const leaves = root.leaves();
    const unit = kind === 'country' ? 'country' : 'sector';

    svg.attr(
      'aria-label',
      `Circle pack of ${year} CO₂ emissions by ${unit}. ` +
        `Largest: ${leaves[0]?.data.name} at ${formatValue(leaves[0]?.data.value ?? 0)} megatonnes.`,
    );

    const colour = scaleOrdinal()
      .domain(leaves.map((d) => d.data.name))
      .range(
        leaves.map((_, i) =>
          scaleSequential(interpolateSpectral).domain([leaves.length, 0])(i),
        ),
      );

    const node = svg
      .selectAll('g.bubble')
      .data(leaves, (d) => d.data.name)
      .join(
        (enter) => {
          const g = enter.append('g').attr('class', 'bubble');
          g.append('circle');
          g.append('title');
          return g;
        },
        (update) => update,
        (exit) => exit.transition().duration(300).style('opacity', 0).remove(),
      );

    node
      .transition()
      .duration(600)
      .attr('transform', (d) => `translate(${d.x},${d.y})`);

    node
      .select('circle')
      .attr('fill', (d) => colour(d.data.name))
      .transition()
      .duration(600)
      .attr('r', (d) => d.r);

    node
      .select('title')
      .text((d) => `${d.data.name}: ${formatValue(d.data.value)} Mt CO₂`);

    node
      .on('pointerenter', (event, d) => {
        tooltip
          .html(`<strong>${d.data.name}</strong><br>${formatValue(d.data.value)} Mt CO₂`)
          .style('opacity', 1);
        move(event);
      })
      .on('pointermove', move)
      .on('pointerleave', () => tooltip.style('opacity', 0));

    function move(event) {
      const bounds = container.getBoundingClientRect();
      tooltip
        .style('left', `${event.clientX - bounds.left + 12}px`)
        .style('top', `${event.clientY - bounds.top - 12}px`);
    }
  }

  return { render };
}

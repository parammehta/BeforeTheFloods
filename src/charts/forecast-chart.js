/**
 * 5 day / 3 hour temperature forecast, with a min–max band.
 *
 * Ported from the d3 v4 `weatherVisualization` directive. Fixes:
 *   - `d3.mouse(this)` was removed in v6 → `d3.pointer(event, node)`.
 *   - The y-scale domain was `[max, 0]` against range `[60, height]`, i.e.
 *     inverted twice and with a hard-coded 60px top. It also clamped the floor
 *     to 0°C, so any forecast below freezing was drawn off the axis. The domain
 *     is now the actual data extent.
 *   - `d3.select("svg").remove()` removed the *first* svg on the whole page,
 *     which was the pollution chart, not this one.
 *   - The temp_min/temp_max fields were computed and then never drawn.
 */

import { axisBottom, axisLeft } from 'd3-axis';
import { scaleLinear, scaleTime } from 'd3-scale';
import { select, pointer } from 'd3-selection';
import { area, curveMonotoneX, line } from 'd3-shape';
import { extent, bisector } from 'd3-array';
import { timeFormat } from 'd3-time-format';

import { inUnit } from '../weather/openweather.js';

const MARGIN = { top: 24, right: 24, bottom: 32, left: 44 };
const WIDTH = 860;
const HEIGHT = 300;

const formatTick = timeFormat('%a %H:%M');
const formatHover = timeFormat('%a %e %b, %H:%M');
const bisectDate = bisector((d) => d.date).left;

export function createForecastChart(container) {
  const svg = select(container)
    .selectAll('svg')
    .data([null])
    .join('svg')
    .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
    .attr('class', 'chart chart--forecast')
    .attr('role', 'img');

  /**
   * @param {{list: Array}} forecast  raw OpenWeatherMap /forecast payload
   * @param {'C'|'F'} unit
   */
  function render(forecast, unit) {
    const series = forecast.list.map((entry) => ({
      date: new Date(entry.dt * 1000),
      temp: inUnit(entry.main.temp, unit),
      min: inUnit(entry.main.temp_min, unit),
      max: inUnit(entry.main.temp_max, unit),
      label: entry.weather[0]?.description ?? '',
    }));

    const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

    const x = scaleTime()
      .domain(extent(series, (d) => d.date))
      .range([0, innerWidth]);

    const y = scaleLinear()
      .domain([
        Math.min(...series.map((d) => d.min)),
        Math.max(...series.map((d) => d.max)),
      ])
      .nice()
      .range([innerHeight, 0]);

    svg
      .attr('aria-label',
        `Temperature forecast for the next five days in degrees ${unit === 'F' ? 'Fahrenheit' : 'Celsius'}, ` +
        `ranging from ${Math.round(y.domain()[0])} to ${Math.round(y.domain()[1])} degrees.`);

    svg.selectAll('*').remove();
    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(x).ticks(6).tickFormat(formatTick));

    g.append('g')
      .attr('class', 'axis axis--y')
      .call(axisLeft(y).ticks(5).tickFormat((d) => `${d}°`));

    /* min–max band, which the original computed but never drew. */
    g.append('path')
      .datum(series)
      .attr('class', 'forecast__band')
      .attr(
        'd',
        area()
          .curve(curveMonotoneX)
          .x((d) => x(d.date))
          .y0((d) => y(d.min))
          .y1((d) => y(d.max)),
      );

    g.append('path')
      .datum(series)
      .attr('class', 'forecast__line')
      .attr(
        'd',
        line()
          .curve(curveMonotoneX)
          .x((d) => x(d.date))
          .y((d) => y(d.temp)),
      );

    /* Crosshair. */
    const focus = g.append('g').attr('class', 'forecast__focus').style('display', 'none');
    focus.append('line').attr('class', 'forecast__crosshair').attr('y1', 0).attr('y2', innerHeight);
    focus.append('circle').attr('class', 'forecast__dot').attr('r', 4);

    const readout = focus
      .append('text')
      .attr('class', 'forecast__readout')
      .attr('dy', '-0.8em');

    g.append('rect')
      .attr('class', 'chart__surface')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .on('pointerenter', () => focus.style('display', null))
      .on('pointerleave', () => focus.style('display', 'none'))
      .on('pointermove', function (event) {
        const [mx] = pointer(event, this);
        const date = x.invert(mx);
        const i = bisectDate(series, date, 1);
        const a = series[i - 1];
        const b = series[i] ?? a;
        const d = date - a.date > b.date - date ? b : a;

        focus.attr('transform', `translate(${x(d.date)},0)`);
        focus.select('circle').attr('cy', y(d.temp));
        readout
          .attr('y', y(d.temp))
          .attr('text-anchor', x(d.date) > innerWidth - 120 ? 'end' : 'start')
          .attr('dx', x(d.date) > innerWidth - 120 ? -8 : 8)
          .text(`${d.temp.toFixed(1)}°${unit} · ${formatHover(d.date)}`);
      });
  }

  return { render };
}

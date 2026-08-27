/**
 * "The past, present and future of CO₂" — balloons rising off a curved Earth,
 * one per megatonne-scaled emitter, accumulating against the 2°C carbon budget.
 * Data: WRI CAIT (historical) and the IPCC RCP scenarios (projected).
 *
 * Ported from the d3 v3 `greenHouseGas` directive. This was the largest and
 * most v3-specific piece of the old build.
 *
 * API migration (v3 → v7):
 *   d3.scale.linear()        → d3.scaleLinear()
 *   d3.svg.axis().orient()   → d3.axisLeft()
 *   d3.behavior.drag()       → d3.drag()
 *   d3.event.*               → the event argument passed to the listener
 *   d3.mouse(node)           → d3.pointer(event, node)
 *   d3.format("%")           → d3.format(".0%")
 *   d3.csv(url, cb)          → await d3.csv(url)
 *   selection[0][i]          → selection.nodes()[i]
 *   transition.each("end")   → transition.on("end")
 *
 * Behavioral fixes:
 *   - v3's `enter().append()` back-filled the update selection in place, so
 *     `countries[0][i]` saw entering *and* updating nodes. v4 dropped that, so
 *     the balloon loops have to run against `enter.merge(update)` or they only
 *     ever see nodes that already existed — on the first frame, none.
 *   - `jumpToStep()` set `current_step` and highlighted the button but never
 *     called `showStep1..4()`; those were only reachable from a Talkie audio
 *     timeline that is not in this build. The step buttons were therefore
 *     inert. `jumpToStep()` now runs the matching step.
 *   - Removed code with no markup behind it: the audio narration player, the
 *     embed popup, and the sources drawer.
 */

import { csv } from 'd3-fetch';
import { scaleLinear } from 'd3-scale';
import { axisLeft } from 'd3-axis';
import { select, selectAll, pointer } from 'd3-selection';
import { drag } from 'd3-drag';
import { format } from 'd3-format';
import { sum } from 'd3-array';
import 'd3-transition';

import { COUNTRY_CONTINENT } from '../data/country-continent.js';
import { DATA_BASE } from '../lib/paths.js';

/* ---------------------------------------------------------------- constants */

const SVG_W = 940;
const SVG_H = 875;
const VISIBLE_H = SVG_W * 0.6;
const X_MARGIN = 70;
const TOP_MARGIN = 50;
const BUDGET_AREA_H = SVG_H * 0.25;
const BUBBLE_SCALE = 0.5;
const RADIUS_OF_THE_EARTH = 1250;
const VISIBLE_EARTH_H = RADIUS_OF_THE_EARTH * 0.4;
const COUNTRY_SPACING_IN_DEGREES = 1.5;
const NUM_COUNTRIES_VISIBLE = 20;
const DURATION = 2000;
const CUMULATIVE_DELAY = DURATION;
const DATA_FINAL_YEAR = 2200;
const SLIDER_START_YEAR = 1860;
const BUDGET_DEFAULT = 2_900_000;

const SCENARIOS = ['RCP8.5', 'RCP6', 'RCP4.5', 'RCP3PD'];
const CONTINENTS = [
  'Europe',
  'Africa',
  'Asia',
  'North America',
  'South America',
  'Oceania',
  'Antarctica',
];
const CONTINENTS_COLS = [
  '#0099CC',
  '#003F6A',
  '#E98300',
  '#007A4D',
  '#7D0063',
  '#C51F24',
  'white',
  '#bbb',
];

const SHORT_NAMES = {
  'United States of America': 'USA',
  'Russian Federation': 'Russia',
  'United Kingdom': 'UK',
  'Czech Republic': 'Czech Rep',
};

const CO2_COLUMN = 'Emissions excluding land use (Mt CO2)';
const LAND_USE_COLUMN = 'Emissions from land use (Mt CO2)';
const NAME_COLUMN = 'Country name';

/* ------------------------------------------------------------ data reshaping */

/**
 * Roll the per-country, per-year rows up into
 * `byYear[year][country] = { Annual: [4], Cumulative: [4] }`, one slot per
 * RCP scenario. Unchanged in shape from the original; only tidied.
 */
function getCumulativeData(rows) {
  const byYear = {};
  const cumulativeByCountry = {};
  const cumulativeByContinent = {};

  for (const row of rows) {
    const year = row.Year;
    const country = row[NAME_COLUMN];
    const continent = `${CONTINENTS[COUNTRY_CONTINENT[row['Alpha-3']]]} (Continent)`;
    const co2Column = parseFloat(row[CO2_COLUMN]);
    const landUse = parseFloat(row[LAND_USE_COLUMN]);
    const scenarios = SCENARIOS.map((key) => parseFloat(row[key]));

    cumulativeByCountry[country] ??= [0, 0, 0, 0];
    cumulativeByContinent[continent] ??= [0, 0, 0, 0];
    byYear[year] ??= {};

    for (let j = 0; j < scenarios.length; j++) {
      // A row with no scenario figure falls back to the observed CO2 column,
      // and a row with neither (OWID reports land-use change for many more
      // country-years than it reports fossil CO2 for) contributes 0 rather
      // than NaN — otherwise one sparse row poisons every later cumulative
      // sum for that country and continent, for the rest of the run.
      const co2 = Number.isNaN(scenarios[j])
        ? Number.isNaN(co2Column)
          ? 0
          : co2Column
        : scenarios[j];

      cumulativeByCountry[country][j] += co2;
      cumulativeByContinent[continent][j] += co2;

      if (!Number.isNaN(landUse)) {
        cumulativeByCountry[country][j] += landUse;
        cumulativeByContinent[continent][j] += landUse;
      }

      byYear[year][country] ??= { Annual: [0, 0, 0, 0], Cumulative: [0, 0, 0, 0] };
      byYear[year][country].Annual[j] = co2;
      byYear[year][country].Cumulative[j] = cumulativeByCountry[country][j];

      byYear[year][continent] ??= { Annual: [0, 0, 0, 0], Cumulative: [0, 0, 0, 0] };
      byYear[year][continent].Annual[j] += co2;
      byYear[year][continent].Cumulative[j] = cumulativeByContinent[continent][j];
    }
  }

  return byYear;
}

/* ------------------------------------------------------------------ the viz */

export async function renderGreenhouseGas(root) {
  const co2Data = await csv(`${DATA_BASE}/greenhouse-gas.csv`);
  const cumulativeData = getCumulativeData(co2Data);

  /* The last year with an observed (not RCP-projected) World total. Fixed at
     2011 in the 2017 file; now tracks whatever scripts/fetch-data.mjs last
     pulled, so the slider always reaches the newest real data. */
  const SLIDER_END_YEAR = Math.max(
    ...co2Data
      .filter((d) => d[NAME_COLUMN] === 'World' && d[CO2_COLUMN] !== '')
      .map((d) => +d.Year),
  );

  /* Mutable view state. */
  let currentYear = null;
  let currentStep = 1;
  let currentSortOrder = 'CO2';
  let currentScenario = 0;
  let budget = BUDGET_DEFAULT;
  let bubbleMargin = 24;
  let ticker = null;
  let scenarioTicker = null;

  /** The merged enter+update selection of country groups. */
  let countries = select(null);

  const $ = (selector) => root.querySelector(selector);
  const sel = (selector) => select(root).select(selector);
  const selAll = (selector) => select(root).selectAll(selector);

  /* ------------------------------------------------------------ scaffolding */

  const svg = select($('[data-svg-holder]'))
    .append('svg')
    .attr('viewBox', `0 0 ${SVG_W} ${VISIBLE_H}`)
    .attr('class', 'ghg__svg')
    .attr('role', 'img')
    .attr(
      'aria-label',
      'Animated visualisation: balloons representing annual CO₂ emissions rise ' +
        'from a curved Earth, while a bar tracks how much of the 2°C carbon ' +
        'budget has been consumed.',
    );

  const svgInner = svg
    .append('g')
    .attr('id', 'svg-contents')
    .attr('transform', `translate(0,${-(SVG_H - VISIBLE_H)})`);

  const bg = svgInner.append('g').attr('id', 'background');
  bg.append('rect').attr('width', SVG_W).attr('height', SVG_H).attr('id', 'sky');

  svgInner
    .append('clipPath')
    .attr('id', 'bubble-clip')
    .append('rect')
    .attr('x', -SVG_W / 2)
    .attr('width', SVG_W)
    .attr('y', -(SVG_H - VISIBLE_EARTH_H + RADIUS_OF_THE_EARTH))
    .attr('height', SVG_H);

  const emissionsText = svgInner
    .append('g')
    .attr('transform', `translate(${SVG_W / 2}, 90)`)
    .attr('id', 'emissions-text');

  emissionsText.append('text').attr('id', 'emissions-label').text('Top 20 emitters in');
  emissionsText.append('text').attr('id', 'emissions-year').attr('y', 70);
  emissionsText
    .append('text')
    .attr('id', 'emissions-label-note')
    .text('from fossil fuel and cement')
    .attr('y', 95);
  emissionsText
    .append('text')
    .attr('class', 'explainer')
    .attr('fill', '#189ACA')
    .text('Use the controls below to explore')
    .attr('y', 140);

  const emissionsGroup = svgInner
    .append('g')
    .attr('id', 'emissions')
    .attr(
      'transform',
      `translate(${SVG_W / 2},${SVG_H - VISIBLE_EARTH_H + RADIUS_OF_THE_EARTH})`,
    )
    .attr('clip-path', 'url(#bubble-clip)');

  emissionsGroup.append('circle').attr('id', 'earth').attr('r', RADIUS_OF_THE_EARTH);

  const budgetHolder = svgInner
    .append('g')
    .attr('id', 'budget-holder')
    .attr('opacity', 0.98)
    .attr('transform', `translate(${X_MARGIN}, ${-(BUDGET_AREA_H + TOP_MARGIN)})`);

  budgetHolder
    .append('rect')
    .attr('id', 'budget')
    .attr('width', SVG_W - X_MARGIN * 2)
    .attr('height', BUDGET_AREA_H);

  budgetHolder
    .append('rect')
    .attr('id', 'cumulative')
    .attr('width', SVG_W - X_MARGIN * 2)
    .attr('height', 0)
    .attr('y', BUDGET_AREA_H);

  budgetHolder.append('g').attr('id', 'cumulative-breakdown');

  const budgetText = budgetHolder
    .append('g')
    .attr('id', 'budget-text')
    .attr('transform', `translate(${(SVG_W - X_MARGIN * 2) / 2},0)`);

  budgetText.append('text').attr('id', 'budget-label').attr('y', 25).text('The 2°C emissions budget');

  const progress = budgetText.append('text').attr('id', 'progress-indicator').attr('y', 70);
  progress.append('tspan').attr('id', 'year-label').text(`${SLIDER_START_YEAR} `);
  progress.append('tspan').attr('id', 'percent-label').text('0% used');

  const budgetScale = scaleLinear().range([BUDGET_AREA_H, 0]).domain([0, 1]);
  budgetHolder
    .append('g')
    .attr('class', 'y axis')
    .call(axisLeft(budgetScale).ticks(3).tickSize(10, 0).tickFormat(format('.0%')));

  /* ---------------------------------------------------------------- helpers */

  const getRadius = (d) =>
    Math.max(1, Math.sqrt(Math.abs(d[CO2_COLUMN] || d[SCENARIOS[currentScenario]])) * BUBBLE_SCALE);

  function getYearData(year) {
    if (year > SLIDER_END_YEAR) {
      return co2Data.filter((d) => d.Year == year && d[NAME_COLUMN] === 'World');
    }

    const ret = co2Data
      .filter((d) => d.Year == year && d[NAME_COLUMN] !== 'World')
      .sort((a, b) => b[CO2_COLUMN] - a[CO2_COLUMN])
      .slice(0, NUM_COUNTRIES_VISIBLE);

    ret.forEach((d, i) => {
      d.rank = i + 1;
    });

    if (currentSortOrder === 'continents') {
      ret.sort((a, b) => {
        const ca = COUNTRY_CONTINENT[a['Alpha-3']];
        const cb = COUNTRY_CONTINENT[b['Alpha-3']];
        if (cb !== ca) return cb > ca ? 1 : -1;
        return b[CO2_COLUMN] - a[CO2_COLUMN];
      });
    }

    return ret.reverse();
  }

  /* ------------------------------------------------------------- balloons */

  function floatBalloon(node, d, year, delay) {
    const balloon = select(node)
      .append('circle')
      .attr('class', `balloon balloon-${year}`)
      .attr('cx', 0)
      .attr('opacity', 0.8)
      .attr('cy', -(RADIUS_OF_THE_EARTH + bubbleMargin))
      .attr('r', 0);

    if (scenarioTicker != null) {
      balloon
        .transition()
        .duration(DURATION / 2)
        .attr('cy', -(RADIUS_OF_THE_EARTH + bubbleMargin) - getRadius(d))
        .attr('r', getRadius(d))
        .attr('cy', -RADIUS_OF_THE_EARTH - SVG_H + VISIBLE_EARTH_H)
        .transition()
        .duration(DURATION)
        .attr('opacity', 0)
        .remove();
    } else {
      balloon
        .transition()
        .duration(DURATION / 2)
        .delay(delay)
        .attr('cy', -(RADIUS_OF_THE_EARTH + bubbleMargin) - getRadius(d))
        .attr('r', getRadius(d))
        .transition()
        .duration(DURATION)
        .attr('opacity', 0)
        .attr('cy', -RADIUS_OF_THE_EARTH - SVG_H + VISIBLE_EARTH_H)
        .remove();
    }
  }

  function sinkBalloon(node, d, year) {
    select(node)
      .append('circle')
      .attr('class', `balloon balloon-${year}`)
      .attr('cx', 0)
      .attr('opacity', 0)
      .attr('cy', -RADIUS_OF_THE_EARTH - SVG_H + VISIBLE_EARTH_H)
      .attr('r', getRadius(d))
      .transition()
      .duration(DURATION)
      .attr('cy', -(RADIUS_OF_THE_EARTH + bubbleMargin))
      .attr('opacity', 0.3)
      .attr('r', 0)
      .remove();
  }

  function floatBalloons(year, yearData, delay) {
    const nodes = countries.nodes();
    for (let i = 0; i < yearData.length; i++) {
      const node = nodes[i];
      const d = yearData[i];
      if (!node) continue;
      if (d[NAME_COLUMN] === 'World' && d[SCENARIOS[currentScenario]] < 0) {
        sinkBalloon(node, d, year);
      } else {
        floatBalloon(node, d, year, delay);
      }
    }
  }

  function sinkBalloons(year) {
    const yearData = getYearData(year);
    const nodes = countries.nodes();
    for (let i = 0; i < yearData.length; i++) {
      if (nodes[i]) sinkBalloon(nodes[i], yearData[i], year);
    }
  }

  /* -------------------------------------------------------------- infobox */

  function showInfo(event, d, index) {
    const [x0, y0] = pointer(event, $('[data-ghg-main]'));
    let x = x0 + 5;
    const y = y0 + 5;
    const node = select(event.currentTarget);

    if (node.classed('country')) {
      sel('[data-infobox-country]').text(d[NAME_COLUMN]);
      sel('[data-infobox-stat]').text(
        `${Math.round(10 * d[CO2_COLUMN]) / 10} Mt CO₂ in ${currentYear}`,
      );
      sel('[data-infobox-rank]').text(`Rank: ${d.rank}`);
    } else if (node.classed('continent')) {
      sel('[data-infobox-country]').text(
        CONTINENTS[index] || 'Global deforestation & land use change',
      );
      sel('[data-infobox-stat]').text(
        `${Math.round(10 * d * 100) / 10}% of emissions up to ${currentYear}`,
      );
      sel('[data-infobox-rank]').text('');
    }

    const box = $('[data-infobox]');
    if (x > window.innerWidth - box.clientWidth) x -= box.clientWidth;

    select(box).style('left', `${x}px`).style('top', `${y}px`).style('opacity', 1);
  }

  const hideInfo = () => sel('[data-infobox]').style('opacity', 0);

  /** DOM index of a node among its siblings — replaces v6's dropped `i` arg. */
  const indexOf = (node) => [...node.parentNode.children].indexOf(node);

  /* ------------------------------------------------------------ the update */

  function updateVisualisation(targetYear) {
    const prevYear = currentYear;
    currentYear = targetYear;
    const rewinding = prevYear != null && targetYear <= prevYear;
    const currentYearData = getYearData(currentYear);
    const spread = currentYearData.length > 1;

    const join = select($('#emissions'))
      .selectAll('g.country')
      .data(currentYearData, (d) => d[NAME_COLUMN]);

    const enter = join
      .enter()
      .append('g')
      .classed('country', true)
      .style('fill', (d) => CONTINENTS_COLS[COUNTRY_CONTINENT[d['Alpha-3']]])
      .attr('transform', spread ? 'rotate(-90)' : 'rotate(0)')
      .on('mouseenter', function (event, d) {
        showInfo(event, d, indexOf(this));
      })
      .on('mouseleave', hideInfo);

    if (spread) {
      enter
        .append('circle')
        .attr('class', 'shadow')
        .attr('cx', 0)
        .attr('cy', -(RADIUS_OF_THE_EARTH + bubbleMargin));
    }

    enter
      .append('text')
      .classed('country-label', true)
      .attr('transform', `rotate(90) translate(${-(RADIUS_OF_THE_EARTH - 5)},5)`)
      .attr('font-size', (d) => (d[NAME_COLUMN] === 'World' ? 25 : 22))
      .text((d) => SHORT_NAMES[d[NAME_COLUMN]] ?? d[NAME_COLUMN]);

    /* The little factory chimney under each label. */
    enter
      .append('polygon')
      .attr(
        'points',
        '11.661,10.258 10.683,1.409 8.428,1.409 7.391,10.258 6.846,10.258 5.5,-1.909 ' +
          '3.245,-1.909 1.819,10.258 -1,10.258 -1,18 14.484,18 14.484,10.258',
      )
      .attr('transform', (d) =>
        d[NAME_COLUMN] === 'World'
          ? `translate(-11,${-(RADIUS_OF_THE_EARTH + 36)}) scale(2)`
          : `translate(-5,${-(RADIUS_OF_THE_EARTH + 18)})`,
      );

    join.exit().transition().duration(DURATION / 2).style('opacity', 0).remove();

    /* v3 folded entering nodes back into the update selection; v7 needs an
       explicit merge before the balloon loops can address every country. */
    countries = enter.merge(join);

    countries
      .transition()
      .duration(DURATION)
      .style('opacity', 1)
      .attr('transform', (_d, i) =>
        spread ? `rotate(${COUNTRY_SPACING_IN_DEGREES * (i - NUM_COUNTRIES_VISIBLE / 2)})` : 'rotate(0)',
      );

    /* On the very first frame there is no previous year to animate from, so
       there is nothing to sink or float — without this guard `prevYear + 1`
       is 1 and the loop replays seventeen centuries of balloons. */
    if (prevYear != null) {
      for (let year = prevYear; year > targetYear; year--) sinkBalloons(year);

      for (let year = prevYear + 1; year <= targetYear; year++) {
        floatBalloons(year, getYearData(year), DURATION / 2 / (targetYear - year + 2));
      }
    }

    countries
      .select('circle.shadow')
      .interrupt()
      .transition()
      .duration(0)
      .attr('cy', (d) => -(RADIUS_OF_THE_EARTH + bubbleMargin) - getRadius(d))
      .attr('r', 0)
      .style('opacity', 0)
      .transition()
      .duration(100)
      .delay(DURATION)
      .attr('r', getRadius)
      .style('opacity', 0.5);

    updateBudget(rewinding);
  }

  function updateBudget(rewinding) {
    const cumulative = cumulativeData[currentYear].World.Cumulative[currentScenario];
    const proportion = cumulative / budget;
    const cumulativeH = BUDGET_AREA_H * proportion;
    const trackWidth = SVG_W - X_MARGIN * 2;

    sel('#cumulative')
      .transition()
      .duration(scenarioTicker != null ? DURATION / 10 : DURATION / 3)
      .delay(rewinding || scenarioTicker != null || currentStep === 4 ? 100 : CUMULATIVE_DELAY)
      .attr('height', Math.max(1, cumulativeH))
      .attr('y', BUDGET_AREA_H - cumulativeH)
      .style('fill', () => {
        const redBegins = 0.8;
        const s = Math.max(0, (100 * (proportion - redBegins)) / (1 - redBegins));
        const l = Math.max(0, Math.min(50, (47 * (proportion - redBegins)) / (1 - redBegins)));
        return `hsl(0,${s}%, ${l}%)`;
      });

    const proportions = CONTINENTS.map((name) => {
      const entry = cumulativeData[currentYear][`${name} (Continent)`];
      const value = entry?.Cumulative ? entry.Cumulative[currentScenario] / cumulative : 0;
      // Negative shares are clamped rather than modelled, as in the original.
      return Math.max(0, value);
    });

    const total = sum(proportions);
    // Two things can push the continents' combined share above 100% of the
    // world total: a continent with strongly negative land-use (a net carbon
    // sink pulling the world total down), or OWID counting a historical state
    // and its successors in the same continent bucket for an overlapping
    // period (USSR alongside Russia, West/East Germany alongside Germany).
    // Either way, clamp "other" at 0 rather than feed a negative width to an
    // <svg:rect> — the breakdown will read as ~100%+ for that year instead of
    // silently redistributing the excess.
    proportions.push(Math.max(0, total > 0 ? 1 - total : 0));

    const delay = rewinding || currentStep === 4 ? 0 : CUMULATIVE_DELAY;

    const breakdown = select($('#cumulative-breakdown'))
      .selectAll('g.continent')
      .data(proportions);

    let offset = 0;
    const breakdownEnter = breakdown
      .enter()
      .append('g')
      .attr('class', 'continent')
      .attr('fill', (_d, i) => CONTINENTS_COLS[i])
      .attr('transform', (d) => {
        const x = offset;
        offset += d * trackWidth;
        return `translate(${x},${BUDGET_AREA_H - cumulativeH})`;
      })
      .on('mouseenter', function (event, d) {
        showInfo(event, d, indexOf(this));
      })
      .on('mouseleave', hideInfo);

    // An explicit starting width/height, not just an omitted attribute, so the
    // transition below interpolates from a real number. Leaving both unset (as
    // the v3 original did) works under v3's transition engine but under v7 the
    // enter transition can interpolate through a negative width on its first
    // frame, which <svg:rect> rejects outright.
    breakdownEnter.append('rect').attr('width', 0).attr('height', 0);
    breakdownEnter
      .append('text')
      .text((_d, i) => CONTINENTS[i] || 'Deforestation & land use')
      .attr('opacity', 0);

    breakdown.exit().remove();

    const blocks = breakdownEnter.merge(breakdown);

    offset = 0;
    blocks
      .transition()
      .duration(DURATION / 3)
      .delay(delay)
      .attr('transform', (d) => {
        const x = offset;
        offset += d * trackWidth;
        return `translate(${x},${BUDGET_AREA_H - cumulativeH})`;
      });

    blocks
      .select('rect')
      .transition()
      .duration(DURATION / 3)
      .delay(delay)
      .attr('height', Math.max(1, cumulativeH))
      .attr('width', (d) => d * trackWidth);

    blocks
      .select('text')
      .transition()
      .duration(DURATION / 3)
      .delay(delay)
      .attr('transform', `translate(3,${cumulativeH - 7})`)
      .attr('opacity', function (d) {
        const blockWidth = d * trackWidth;
        return blockWidth > 6 + this.getComputedTextLength() && cumulativeH > 16 ? 1 : 0;
      });

    selAll('#year-label, #emissions-year').text(`${currentYear} `);
    sel('#percent-label').text(`${Math.round(10 * proportion * 100) / 10}% used`);
  }

  /* ------------------------------------------------------------- scenarios */

  function stopScenario() {
    if (scenarioTicker == null) return;
    clearInterval(scenarioTicker);
    scenarioTicker = null;
  }

  function startScenario() {
    stopScenario();
    scenarioTicker = setInterval(() => {
      const exhausted =
        currentScenario != 3 &&
        cumulativeData[currentYear].World.Cumulative[currentScenario] >= budget;
      if (currentYear === DATA_FINAL_YEAR || exhausted) {
        stopScenario();
        return;
      }
      updateVisualisation(currentYear + 1);
    }, 175);
  }

  function showScenario(scenario) {
    currentScenario = Number(scenario);
    selAll('.scenario-group').classed(
      'selected',
      function () {
        return Number(this.dataset.scenarioIndex) === currentScenario;
      },
    );

    budget = BUDGET_DEFAULT;

    if (currentYear !== SLIDER_END_YEAR + 1) {
      stopScenario();
      updateVisualisation(SLIDER_END_YEAR + 1);
      setTimeout(startScenario, 1500);
    } else {
      startScenario();
    }
  }

  /* ------------------------------------------------------------ step logic */

  const moveTextUp = () =>
    sel('#budget-text')
      .transition()
      .duration(750)
      .attr('transform', `translate(${(SVG_W - X_MARGIN * 2) / 2}, 0)`)
      .attr('fill', 'black');

  const moveTextDown = () =>
    sel('#budget-text')
      .transition()
      .duration(DURATION)
      .attr('transform', `translate(${(SVG_W - X_MARGIN * 2) / 2}, 110)`)
      .attr('fill', 'white');

  function slideIntroIn() {
    sel('#svg-contents')
      .transition()
      .duration(1000)
      .attr('transform', `translate(0,${-(SVG_H - VISIBLE_H)})`);
    sel('[data-ghg-intro]').transition().duration(750).style('bottom', '40px');
  }

  function slideIntroOut() {
    sel('#svg-contents')
      .transition()
      .duration(1000)
      .delay(500)
      .attr('transform', 'translate(0,0)');
    sel('[data-ghg-intro]').transition().duration(750).style('bottom', '-260px');
  }

  function slideBudgetIn() {
    sel('#emissions-text')
      .transition()
      .duration(1000)
      .delay(1000)
      .attr('transform', `translate(${SVG_W / 2}, 500)`);
    sel('#budget-holder')
      .transition()
      .duration(1000)
      .delay(1000)
      .attr('transform', `translate(${X_MARGIN}, ${TOP_MARGIN})`);
    sel('#bubble-clip rect')
      .transition()
      .duration(1000)
      .delay(1000)
      .attr('y', -RADIUS_OF_THE_EARTH - (SVG_H - TOP_MARGIN - BUDGET_AREA_H - VISIBLE_EARTH_H))
      .attr('height', SVG_H - BUDGET_AREA_H - TOP_MARGIN);
  }

  function slideBudgetOut() {
    sel('#emissions-text')
      .transition()
      .duration(1000)
      .delay(1000)
      .attr('transform', `translate(${SVG_W / 2}, 90)`);
    sel('#budget-holder')
      .transition()
      .duration(1000)
      .delay(1000)
      .attr('transform', `translate(${X_MARGIN}, ${-(BUDGET_AREA_H + TOP_MARGIN)})`);
    sel('#bubble-clip rect')
      .transition()
      .duration(1000)
      .delay(1000)
      .attr('y', -(SVG_H - VISIBLE_EARTH_H + RADIUS_OF_THE_EARTH))
      .attr('height', SVG_H);
  }

  function spinCountriesTogether() {
    bubbleMargin = 45;
    selAll('.country')
      .transition()
      .duration(1000)
      .attr('transform', 'rotate(0)')
      .style('opacity', (d) => (d[NAME_COLUMN] === 'World' ? 1 : 0));
  }

  const slideScenariosIn = () => {
    sel('[data-ghg-scenarios]').transition().duration(1000).style('bottom', '50px');
    selAll('.hideable-controls').transition().duration(1000).style('opacity', 0);
  };

  const slideScenariosOut = () => {
    sel('[data-ghg-scenarios]').transition().duration(1000).style('bottom', '-500px');
    selAll('.hideable-controls').transition().duration(1000).style('opacity', 1);
  };

  const STEPS = {
    1: () => {
      slideIntroIn();
      slideBudgetOut();
      updateVisualisation(SLIDER_START_YEAR);
      updateSliderHandle();
      slideScenariosOut();
    },
    2: () => {
      slideIntroOut();
      slideBudgetOut();
      updateVisualisation(currentYear);
      updateSliderHandle();
      slideScenariosOut();
    },
    3: () => {
      slideIntroOut();
      slideBudgetIn();
      updateVisualisation(currentYear);
      updateSliderHandle();
      slideScenariosOut();
    },
    4: () => {
      updateVisualisation(SLIDER_END_YEAR + 1);
      spinCountriesTogether();
      slideIntroOut();
      slideBudgetIn();
      slideScenariosIn();
    },
  };

  function jumpToStep(step) {
    if (step < 4) {
      budget = BUDGET_DEFAULT;
      moveTextUp();
    } else {
      moveTextDown();
    }

    bubbleMargin = step < 4 ? 24 : 50;
    currentStep = step;
    if (step < 4 && currentYear > SLIDER_END_YEAR) currentYear = SLIDER_END_YEAR;

    stopScenario();
    selAll('[data-step]').classed('selected', function () {
      return Number(this.dataset.step) === step;
    });

    // The original stopped here; the step bodies were only reachable from an
    // audio narration timeline that no longer exists, leaving the buttons dead.
    STEPS[step]?.();
  }

  function setSortOrder(order) {
    currentSortOrder = order;
    updateVisualisation(currentYear);
    selAll('[data-sort]').classed('selected', function () {
      return this.dataset.sort === order;
    });
  }

  /* ---------------------------------------------------------------- ticker */

  function stopTicker() {
    if (ticker == null) return;
    clearInterval(ticker);
    ticker = null;
    sel('[data-loop]').attr('aria-pressed', 'false').select('span').text('Play');
  }

  function startTicker() {
    if (ticker != null) return;
    if (currentYear >= SLIDER_END_YEAR) updateVisualisation(SLIDER_START_YEAR);
    ticker = setInterval(() => {
      updateVisualisation(currentYear + 1);
      updateSliderHandle();
      if (currentYear >= SLIDER_END_YEAR) stopTicker();
    }, DURATION);
    sel('[data-loop]').attr('aria-pressed', 'true').select('span').text('Pause');
  }

  /* ---------------------------------------------------------------- slider */

  const sliderCore = $('[data-slider-core]');
  const sliderHandle = sel('[data-slider-handle]');

  function updateSliderHandle() {
    const width = sliderCore.clientWidth;
    const p = (currentYear - SLIDER_START_YEAR) / (SLIDER_END_YEAR - SLIDER_START_YEAR);
    sliderHandle
      .transition()
      .duration(200)
      .style('left', `${Math.max(0, Math.min(1, p)) * width}px`);
    sliderHandle.attr('aria-valuenow', currentYear);
  }

  function sliderMovedTo(p) {
    const target = Math.round(
      SLIDER_START_YEAR + (SLIDER_END_YEAR - SLIDER_START_YEAR) * Math.max(0, Math.min(1, p)),
    );
    if (target !== currentYear) updateVisualisation(target);
  }

  function initSlider() {
    sel('[data-slider-start]').text(SLIDER_START_YEAR);
    sel('[data-slider-end]').text(SLIDER_END_YEAR);

    select(sliderCore).on('click', (event) => {
      event.preventDefault();
      stopTicker();
      const width = sliderCore.clientWidth;
      const [x] = pointer(event, sliderCore);
      sliderHandle.transition().duration(250).style('left', `${x}px`);
      sliderMovedTo(x / width);
      if (currentStep === 1) jumpToStep(2);
    });

    sliderHandle.call(
      drag().on('drag', (event) => {
        stopTicker();
        const width = sliderCore.clientWidth;
        const x = Math.max(0, Math.min(width, event.x));
        sliderHandle.style('left', `${x}px`);
        sliderMovedTo(x / width);
      }),
    );

    /* Keyboard equivalent for the drag handle. */
    sliderHandle.on('keydown', (event) => {
      const step = event.shiftKey ? 10 : 1;
      if (event.key === 'ArrowLeft') updateVisualisation(Math.max(SLIDER_START_YEAR, currentYear - step));
      else if (event.key === 'ArrowRight') updateVisualisation(Math.min(SLIDER_END_YEAR, currentYear + step));
      else if (event.key === 'Home') updateVisualisation(SLIDER_START_YEAR);
      else if (event.key === 'End') updateVisualisation(SLIDER_END_YEAR);
      else return;
      event.preventDefault();
      stopTicker();
      updateSliderHandle();
    });
  }

  /* -------------------------------------------------------------- controls */

  function initControls() {
    sel('[data-loop]').on('click', () => (ticker ? stopTicker() : startTicker()));

    selAll('[data-step]').on('click', function () {
      jumpToStep(Number(this.dataset.step));
    });

    selAll('[data-sort]').on('click', function () {
      if (this.dataset.sort !== currentSortOrder) setSortOrder(this.dataset.sort);
    });

    selAll('.scenario-group').on('click', function () {
      showScenario(this.dataset.scenarioIndex);
    });

    /* Pause the animation while the section is off screen — it is a heavy,
       transition-driven chart and there is no reason to run it unseen. */
    new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          stopTicker();
          stopScenario();
        }
      },
      { threshold: 0 },
    ).observe(root);
  }

  initControls();
  initSlider();

  /* Mark the default sort without calling setSortOrder(), which would render
     at `currentYear` before any year has been chosen. jumpToStep(1) draws. */
  selAll('[data-sort]').classed('selected', function () {
    return this.dataset.sort === currentSortOrder;
  });
  jumpToStep(1);

  return { destroy: () => (stopTicker(), stopScenario()) };
}

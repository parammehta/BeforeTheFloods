import './styles/base.css';
import './styles/charts.css';
import './styles/greenhouse-gas.css';

import { initNav } from './lib/nav.js';
import { onReveal } from './lib/sections.js';

initNav();

/* Each section renders when it nears the viewport. The chart modules are
   dynamically imported so d3 is only fetched once a reader actually scrolls to
   a visualisation — the hero and copy paint without it. */

onReveal('weather', async () => {
  const { initWeather } = await import('./weather/index.js');
  await initWeather(document.getElementById('weather'));
});

onReveal('pollution', async () => {
  const { renderPollutionIndex } = await import('./charts/pollution-index.js');
  const range = await renderPollutionIndex(document.querySelector('#pollution [data-chart]'));
  const label = document.querySelector('[data-pollution-range]');
  if (label && range) label.textContent = `, ${range.first}–${range.last}`;
});

onReveal('co2', async () => {
  const { createCo2Bubbles, getAvailableYears } = await import('./charts/co2-bubbles.js');
  const section = document.getElementById('co2');
  const chart = createCo2Bubbles(section.querySelector('[data-chart]'));

  const year = section.querySelector('[data-co2-year]');
  const yearLabel = section.querySelector('[data-co2-year-label]');
  const kinds = [...section.querySelectorAll('[data-co2-kind]')];

  const draw = () => {
    yearLabel.textContent = year.value;
    return chart.render({
      year: year.value,
      kind: kinds.find((input) => input.checked)?.value ?? 'country',
    });
  };

  // The slider's range is read from the data rather than hardcoded, so a
  // rerun of scripts/fetch-data.mjs extends it with no HTML edit needed.
  const years = await getAvailableYears('country');
  year.min = String(years[0]);
  year.max = String(years.at(-1));
  year.value = String(years.at(-1));

  year.addEventListener('input', draw);
  kinds.forEach((input) =>
    input.addEventListener('change', async () => {
      const kindYears = await getAvailableYears(input.checked ? input.value : 'country');
      year.min = String(kindYears[0]);
      year.max = String(kindYears.at(-1));
      if (+year.value < kindYears[0] || +year.value > kindYears.at(-1)) {
        year.value = String(kindYears.at(-1));
      }
      draw();
    }),
  );

  await draw();
});

onReveal('forest', async () => {
  const { renderForestMap } = await import('./charts/forest-map.js');
  const section = document.getElementById('forest');
  await renderForestMap(section.querySelector('[data-chart]'), {
    caption: section.querySelector('[data-map-caption]'),
    toggle: section.querySelector('[data-map-toggle]'),
  });
});

onReveal('greenhouse', async () => {
  const { renderGreenhouseGas } = await import('./charts/greenhouse-gas.js');
  await renderGreenhouseGas(document.getElementById('greenhouse'));
});

/* Year in the footer. */
const year = document.querySelector('[data-year]');
if (year) year.textContent = String(new Date().getFullYear());

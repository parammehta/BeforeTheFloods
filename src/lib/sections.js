/**
 * Section lifecycle.
 *
 * The 2017 build kept every section `display:none` and only revealed them as a
 * side effect of the weather API succeeding, so a dead API key hid the whole
 * site. Sections are now always in the document; each one just renders its
 * chart the first time it scrolls near the viewport.
 */

/** @type {IntersectionObserver | undefined} */
let observer;

/** @type {Map<Element, () => void | Promise<void>>} */
const pending = new Map();

function ensureObserver() {
  if (observer) return observer;

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const init = pending.get(entry.target);
        if (!init) continue;

        // One shot: drop it before running so a throwing init can't retry.
        pending.delete(entry.target);
        observer.unobserve(entry.target);
        run(entry.target, init);
      }
    },
    // Start rendering a screen early so the chart is ready on arrival.
    { rootMargin: '200px 0px' },
  );

  return observer;
}

async function run(element, init) {
  element.dataset.state = 'loading';
  try {
    await init();
    element.dataset.state = 'ready';
  } catch (error) {
    element.dataset.state = 'error';
    console.error(`[${element.id || 'section'}] failed to render`, error);
    showFailure(element, error);
  }
}

function showFailure(element, error) {
  const slot = element.querySelector('[data-fallback]');
  if (!slot) return;
  slot.hidden = false;
  slot.textContent = `This visualisation could not be loaded. ${error?.message ?? ''}`.trim();
}

/**
 * Render `init` the first time `#id` approaches the viewport.
 *
 * @param {string} id  Section element id.
 * @param {() => void | Promise<void>} init
 */
export function onReveal(id, init) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`[sections] no element #${id}`);
    return;
  }

  // Without IntersectionObserver, just render everything immediately.
  if (typeof IntersectionObserver === 'undefined') {
    run(element, init);
    return;
  }

  pending.set(element, init);
  ensureObserver().observe(element);
}

/**
 * Force a section to render now, whether or not it has been scrolled to.
 * Used by nav clicks so a jump to an unrendered section is never blank.
 *
 * @param {string} id
 */
export function renderNow(id) {
  const element = document.getElementById(id);
  const init = element && pending.get(element);
  if (!init) return;
  pending.delete(element);
  observer?.unobserve(element);
  run(element, init);
}

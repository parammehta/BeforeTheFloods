/**
 * Sticky nav + scroll spy, replacing jQuery stickUp and the AngularJS router.
 *
 * The old build routed sections through `$routeProvider`, which meant only one
 * section existed in the DOM at a time and the nav's `#anchor` links fought the
 * router for the hash. It is a one page document now, so anchors are just
 * anchors.
 */

import { renderNow } from './sections.js';

export function initNav() {
  const nav = document.querySelector('[data-nav]');
  const toggle = document.querySelector('[data-nav-toggle]');
  const list = document.querySelector('[data-nav-list]');
  const links = [...document.querySelectorAll('[data-nav-link]')];
  if (!nav) return;

  /* Shrink the nav once the hero is behind us. */
  const hero = document.querySelector('[data-hero]');
  if (hero) {
    new IntersectionObserver(
      ([entry]) => nav.classList.toggle('is-stuck', !entry.isIntersecting),
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' },
    ).observe(hero);
  }

  /* Mobile menu. */
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    list?.classList.toggle('is-open', !open);
  });

  /* Clicking a section that has not rendered yet renders it immediately, so
     the browser scrolls to real content instead of an empty placeholder. */
  for (const link of links) {
    link.addEventListener('click', () => {
      const id = link.getAttribute('href')?.slice(1);
      if (id) renderNow(id);
      toggle?.setAttribute('aria-expanded', 'false');
      list?.classList.remove('is-open');
    });
  }

  /* Scroll spy. */
  const targets = links
    .map((link) => document.getElementById(link.getAttribute('href')?.slice(1) ?? ''))
    .filter(Boolean);

  if (!targets.length) return;

  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of links) {
          const active = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        }
      }
    },
    // Fire when a section crosses the upper third of the viewport.
    { rootMargin: '-20% 0px -70% 0px' },
  );

  targets.forEach((target) => spy.observe(target));
}

/**
 * Vite rewrites `import.meta.env.BASE_URL` at build time to whatever `base` is
 * set to in vite.config.js. Data lives in `public/`, so it is copied to the
 * site root verbatim and must be requested through that same prefix — the old
 * relative `../data/...` paths broke the moment the page was not served from
 * the directory the author happened to be in.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export const DATA_BASE = `${BASE}/data`;
export const MEDIA_BASE = `${BASE}/media`;

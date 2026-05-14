import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderRouteEntry(route, { t, type }) {
  const identity = escapeHtml(route.identity);
  const restoreAttribute = type === 'favorite' ? 'data-saved-route' : 'data-recent-route';
  const resultCount = Number.isFinite(route.resultCount) ? route.resultCount : 0;

  return `
    <div class="saved-route-entry">
      <button type="button" class="saved-route-main" ${restoreAttribute}="${identity}">
        <strong>${escapeHtml(route.fromInput)} -> ${escapeHtml(route.toInput)}</strong>
        <span>${escapeHtml(t(`search.dayType.${route.dayType}`))} · ${resultCount} ${escapeHtml(t('saved.results'))}</span>
      </button>
      ${type === 'favorite' ? `
        <button type="button" class="saved-route-remove" data-remove-favorite="${identity}">
          ${escapeHtml(t('saved.remove'))}
        </button>
      ` : ''}
    </div>
  `;
}

function renderSavedSection({ title, emptyMessage, routes, t, type }) {
  return `
    <section class="saved-section">
      <h3>${escapeHtml(title)}</h3>
      ${routes.length
        ? routes.map((route) => renderRouteEntry(route, { t, type })).join('')
        : `<p>${escapeHtml(emptyMessage)}</p>`}
    </section>
  `;
}

export function renderSavedView({
  t = createTranslator('en'),
  favorites = [],
  recents = [],
  available = true,
} = {}) {
  if (!available) {
    return `
      <section class="saved-view">
        <div>
          <p class="eyebrow">${escapeHtml(t('saved.title'))}</p>
          <h2>${escapeHtml(t('saved.title'))}</h2>
          <p>${escapeHtml(t('saved.unavailable'))}</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="saved-view">
      <div>
        <p class="eyebrow">${escapeHtml(t('saved.title'))}</p>
        <h2>${escapeHtml(t('saved.title'))}</h2>
        <p>${escapeHtml(t('saved.subtitle'))}</p>
      </div>
      ${renderSavedSection({
        title: t('saved.favorites'),
        emptyMessage: t('saved.emptyFavorites'),
        routes: favorites,
        t,
        type: 'favorite',
      })}
      ${renderSavedSection({
        title: t('saved.recents'),
        emptyMessage: t('saved.emptyRecents'),
        routes: recents,
        t,
        type: 'recent',
      })}
    </section>
  `;
}

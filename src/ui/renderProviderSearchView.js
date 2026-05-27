import { createTranslator } from '../lib/i18n.js';
import { PROVIDER_SEARCH_SOURCES } from '../lib/providerSearch.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderProviderSearchView({
  provider,
  t = createTranslator('en'),
  values = { from: '', to: '', date: '' },
  actionUrl = '#',
} = {}) {
  return `
    <section class="hero-shell hero-shell--compact provider-search provider-search--${escapeHtml(provider)}">
      <div class="hero-copy">
        <p class="eyebrow">${escapeHtml(t('provider.eyebrow'))}</p>
        <h1>${escapeHtml(t(`provider.${provider}.title`))}</h1>
        <p class="hero-text">${escapeHtml(t(`provider.${provider}.body`))}</p>
      </div>

      <form class="search-form search-form--capsule provider-search-form" data-provider-search="${escapeHtml(provider)}" data-provider-action-url="${escapeHtml(actionUrl)}">
        <div class="search-form-intro">
          <p class="field-hint">${escapeHtml(t(`provider.${provider}.hint`))}</p>
        </div>

        <label class="field">
          <span>${escapeHtml(t('provider.fromLabel'))}</span>
          <input
            name="provider-from"
            value="${escapeHtml(values.from)}"
            placeholder="${escapeHtml(t('provider.fromPlaceholder'))}"
            autocomplete="off"
          />
        </label>

        <label class="field">
          <span>${escapeHtml(t('provider.toLabel'))}</span>
          <input
            name="provider-to"
            value="${escapeHtml(values.to)}"
            placeholder="${escapeHtml(t('provider.toPlaceholder'))}"
            autocomplete="off"
          />
        </label>

        <label class="field">
          <span>${escapeHtml(t('provider.dateLabel'))}</span>
          <input
            type="date"
            name="provider-date"
            value="${escapeHtml(values.date)}"
          />
        </label>

        <div class="provider-search-actions">
          <button type="submit" class="search-form-submit">${escapeHtml(t('provider.submit'))}</button>
          <a class="provider-source-link" data-provider-search-link href="${escapeHtml(actionUrl)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(t('provider.openLink'))}
          </a>
        </div>

        <a class="provider-source-link provider-source-link--secondary" href="${escapeHtml(PROVIDER_SEARCH_SOURCES[provider] ?? actionUrl)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(t(`provider.${provider}.source`))}
        </a>
      </form>
    </section>
  `;
}

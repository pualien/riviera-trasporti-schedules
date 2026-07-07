import { createTranslator } from '../lib/i18n.js';
import { renderTaxiOptionsSection } from './renderTaxiOption.js';
import { renderTransferSuggestions } from './renderTransferSuggestions.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderFallbackSuggestion(suggestion) {
  const action = suggestion.action ?? {};

  return `
    <button type="button"
      class="picker-panel-tag fallback-suggestion-button"
      data-no-direct-action="${escapeHtml(action.type ?? '')}"
      data-stop-id="${escapeHtml(action.stopId ?? suggestion.stopId ?? '')}"
    >
      ${escapeHtml(suggestion.label)}
    </button>
  `;
}

function renderNoBusAlternatives(taxiOptions, t) {
  if (!taxiOptions.length) {
    return '';
  }

  return `
    <section class="no-bus-alternatives">
      <div class="taxi-section-head">
        <h3>${escapeHtml(t('taxi.noBusTitle'))}</h3>
        <p>${escapeHtml(t('taxi.noBusDetail'))}</p>
      </div>
      ${renderTaxiOptionsSection(taxiOptions, { t })}
    </section>
  `;
}

export function renderNoDirectFallback({
  t = createTranslator('en'),
  routeLabel,
  pdfUrl,
  suggestions = [],
  transferSuggestions = [],
  taxiOptions = [],
}) {
  return `
    <section class="empty-state empty-state--fallback" data-result-anchor>
      <p class="eyebrow">${escapeHtml(t('empty.eyebrow'))}</p>
      <h2>${escapeHtml(t('empty.noDirectTitle'))}</h2>
      <p>${escapeHtml(routeLabel)}</p>
      <p>${escapeHtml(t('empty.transferNote'))}</p>
      <div class="fallback-actions">
        <a class="topbar-link" href="${escapeHtml(pdfUrl)}" target="_blank" rel="noreferrer">${escapeHtml(t('results.openPdf'))}</a>
      </div>
      <div class="fallback-suggestions">
        ${suggestions.map(renderFallbackSuggestion).join('')}
      </div>
      ${renderTransferSuggestions({ t, suggestions: transferSuggestions, pdfUrl })}
      ${renderNoBusAlternatives(taxiOptions, t)}
    </section>
  `;
}

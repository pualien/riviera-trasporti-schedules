import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderNoDirectFallback({
  t = createTranslator('en'),
  routeLabel,
  pdfUrl,
  suggestions = [],
}) {
  return `
    <section class="empty-state empty-state--fallback">
      <p class="eyebrow">${escapeHtml(t('empty.eyebrow'))}</p>
      <h2>${escapeHtml(t('empty.noDirectTitle'))}</h2>
      <p>${escapeHtml(routeLabel)}</p>
      <p>${escapeHtml(t('empty.transferNote'))}</p>
      <div class="fallback-actions">
        <a class="topbar-link" href="${pdfUrl}" target="_blank" rel="noreferrer">${escapeHtml(t('results.openPdf'))}</a>
      </div>
      <div class="fallback-suggestions">
        ${suggestions.map((suggestion) => `<span class="picker-panel-tag">${escapeHtml(suggestion.label)}</span>`).join('')}
      </div>
    </section>
  `;
}

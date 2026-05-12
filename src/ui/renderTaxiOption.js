import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderTaxiOption(taxiOption, { t = createTranslator('en') } = {}) {
  if (!taxiOption) {
    return '';
  }

  return `
    <aside class="taxi-option-card">
      <p class="eyebrow">${escapeHtml(t('taxi.eyebrow'))}</p>
      <h3>${escapeHtml(taxiOption.serviceLabel)}</h3>
      <p>${escapeHtml(t('taxi.copy', { province: taxiOption.provinceLabel }))}</p>
      <div class="taxi-option-actions">
        <a class="topbar-link" href="${taxiOption.callHref}">${escapeHtml(t('taxi.call'))} ${escapeHtml(taxiOption.phone)}</a>
        ${taxiOption.bookingUrl
    ? `<a class="topbar-link" href="${taxiOption.bookingUrl}" target="_blank" rel="noreferrer">${escapeHtml(t('taxi.bookOnline'))}</a>`
    : ''}
      </div>
      <p class="taxi-option-meta">
        <a href="${taxiOption.sourceUrl}" target="_blank" rel="noreferrer">${escapeHtml(t('taxi.source'))}</a>
        · ${escapeHtml(t('taxi.verified', { date: taxiOption.verifiedAt }))}
      </p>
    </aside>
  `;
}

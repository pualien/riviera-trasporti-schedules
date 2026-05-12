import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function resolvePhoneEntries(taxiOption) {
  if (Array.isArray(taxiOption.phones) && taxiOption.phones.length) {
    return taxiOption.phones;
  }

  if (taxiOption.phone && taxiOption.callHref) {
    return [{ label: taxiOption.phone, href: taxiOption.callHref }];
  }

  return [];
}

export function renderTaxiOption(taxiOption, { t = createTranslator('en') } = {}) {
  if (!taxiOption) {
    return '';
  }

  const phoneEntries = resolvePhoneEntries(taxiOption);

  return `
    <aside class="taxi-option-card">
      <p class="eyebrow">${escapeHtml(t('taxi.eyebrow'))}</p>
      <h3>${escapeHtml(taxiOption.serviceLabel)}</h3>
      <p>${escapeHtml(t('taxi.copy', { province: taxiOption.provinceLabel }))}</p>
      <div class="taxi-option-actions">
        ${phoneEntries.map((phoneEntry) => `
          <a class="topbar-link" href="${phoneEntry.href}">${escapeHtml(t('taxi.call'))} ${escapeHtml(phoneEntry.label)}</a>
        `).join('')}
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

export function renderTaxiOptionsSection(taxiOptions = [], {
  t = createTranslator('en'),
  titleKey = 'taxi.routeTitle',
  bodyKey = null,
  className = 'taxi-options-section',
} = {}) {
  if (!taxiOptions.length) {
    return '';
  }

  return `
    <section class="${className}">
      <div class="taxi-section-head">
        <h3>${escapeHtml(t(titleKey))}</h3>
        ${bodyKey ? `<p>${escapeHtml(t(bodyKey))}</p>` : ''}
      </div>
      <div class="taxi-option-grid">
        ${taxiOptions.map((taxiOption) => renderTaxiOption(taxiOption, { t })).join('')}
      </div>
    </section>
  `;
}

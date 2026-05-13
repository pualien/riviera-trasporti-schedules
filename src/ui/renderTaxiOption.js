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

function renderCoverageLabels(taxiOption) {
  if (!Array.isArray(taxiOption.coverageLabels) || !taxiOption.coverageLabels.length) {
    return '';
  }

  return `
    <p class="taxi-panel-entry-coverage">${escapeHtml(taxiOption.coverageLabels.join(' · '))}</p>
  `;
}

export function renderTaxiOption(taxiOption, { t = createTranslator('en') } = {}) {
  if (!taxiOption) {
    return '';
  }

  const phoneEntries = resolvePhoneEntries(taxiOption);

  return `
    <article class="taxi-panel-entry">
      <div class="taxi-panel-entry-copy">
        <p class="eyebrow">${escapeHtml(t('taxi.eyebrow'))}</p>
        <h4>${escapeHtml(taxiOption.serviceLabel)}</h4>
        <p>${escapeHtml(t('taxi.copy', { province: taxiOption.provinceLabel }))}</p>
        ${renderCoverageLabels(taxiOption)}
        <p class="taxi-panel-entry-meta">
          <a href="${taxiOption.sourceUrl}" target="_blank" rel="noreferrer">${escapeHtml(t('taxi.source'))}</a>
          · ${escapeHtml(t('taxi.verified', { date: taxiOption.verifiedAt }))}
        </p>
      </div>
      <div class="taxi-panel-entry-actions">
        ${phoneEntries.map((phoneEntry) => `
          <a class="topbar-link" href="${phoneEntry.href}">${escapeHtml(t('taxi.call'))} ${escapeHtml(phoneEntry.label)}</a>
        `).join('')}
        ${taxiOption.bookingUrl
    ? `<a class="topbar-link" href="${taxiOption.bookingUrl}" target="_blank" rel="noreferrer">${escapeHtml(t('taxi.bookOnline'))}</a>`
    : ''}
      </div>
    </article>
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
      <div class="taxi-panel">
        ${taxiOptions.map((taxiOption) => renderTaxiOption(taxiOption, { t })).join('')}
      </div>
    </section>
  `;
}

import {
  APP_SITE_URL,
  BRAND_NAME,
  BRAND_SITE_URL,
  FEEDBACK_FORM_URL,
  ROUTES_INDEX_URL,
} from '../lib/brand.js';
import { createTranslator, SUPPORTED_LANGUAGES } from '../lib/i18n.js';
import { renderAdSlot } from './renderAdSlot.js';
import { renderTaxiOptionsSection } from './renderTaxiOption.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderLanguageOptions(languages, selectedLanguage) {
  return languages
    .map(
      (language) => `
        <option value="${language.code}" ${language.code === selectedLanguage ? 'selected' : ''}>${language.label}</option>
      `,
    )
    .join('');
}

function renderLanguageSelector({ languages, language, t }) {
  return `
    <label class="language-selector">
      <span>${t('shell.language')}</span>
      <select name="language" aria-label="${t('shell.language')}">
        ${renderLanguageOptions(languages, language)}
      </select>
    </label>
  `;
}

function renderFreshnessMarker(datasetInfo, t) {
  if (!datasetInfo?.source) {
    return '';
  }

  return `
    <p class="dataset-freshness">
      ${t('shell.dataFreshness')}${datasetInfo.source.effectiveDate}
      · ${datasetInfo.builtAt.slice(0, 10)}
    </p>
  `;
}

function renderSeoSupportCopy(t) {
  return `
    <section class="seo-support-copy">
      <h2>${t('shell.seoTitle')}</h2>
      <p>${t('shell.seoBody')}</p>
      <p class="seo-support-note">${t('shell.sourceTrustBody')}</p>
    </section>
  `;
}

function renderTaxiDirectory(taxiDirectory, { t, mode }) {
  const directory = renderTaxiOptionsSection(taxiDirectory, {
    t,
    titleKey: 'taxi.directoryTitle',
    bodyKey: 'taxi.directoryBody',
    className: 'taxi-directory-section',
  });

  if (mode !== 'collapsed' || !taxiDirectory.length) {
    return directory;
  }

  return `
    <details class="global-alternatives">
      <summary>
        <span>${escapeHtml(t('shell.globalAlternatives'))}</span>
        <small>${escapeHtml(t('shell.globalAlternativesDetail'))}</small>
      </summary>
      ${directory}
    </details>
  `;
}

function renderSecondaryActions({ languages, language, t }) {
  return `
    <a class="topbar-link" href="${FEEDBACK_FORM_URL}" target="_blank" rel="noreferrer">
      ${t('shell.feedback')}
    </a>
    <a class="topbar-link" href="${BRAND_SITE_URL}" target="_blank" rel="noreferrer">
      ${t('shell.officialSite')}
    </a>
    ${renderLanguageSelector({ languages, language, t })}
  `;
}

export function renderShell(
  content,
  {
    language = 'en',
    languages = SUPPORTED_LANGUAGES,
    adSlots = {},
    datasetInfo = null,
    pwaControl = '',
    taxiDirectory = [],
    taxiDirectoryMode = 'open',
    tabNavigation = '',
    t = createTranslator('en'),
  } = {},
) {
  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand-lockup">
          <a class="brand-wordmark" href="${APP_SITE_URL}" aria-label="${BRAND_NAME}">
            ${escapeHtml(BRAND_NAME)}
          </a>
          <p class="brand-subtitle">${t('shell.subtitle')}</p>
          ${renderFreshnessMarker(datasetInfo, t)}
        </div>
        <div class="topbar-actions">
          ${pwaControl}
          <a class="topbar-link" href="${ROUTES_INDEX_URL}">
            ${t('shell.routesIndex')}
          </a>
          <div class="topbar-secondary-actions topbar-secondary-actions--desktop">
            ${renderSecondaryActions({ languages, language, t })}
          </div>
          <details class="topbar-more-actions topbar-more-actions--mobile">
            <summary class="topbar-link topbar-more-summary">${t('shell.more')}</summary>
            <div class="topbar-more-panel">
              ${renderSecondaryActions({ languages, language, t })}
            </div>
          </details>
        </div>
      </header>
      ${tabNavigation}
      ${content}
      ${renderAdSlot({
        slotId: 'shell-lead',
        className: 'ad-slot--lead',
        content: adSlots.lead,
      })}
      ${renderSeoSupportCopy(t)}
      ${renderAdSlot({
        slotId: 'shell-utility',
        className: 'ad-slot--utility',
        content: adSlots.utility,
      })}
      ${renderTaxiDirectory(taxiDirectory, { t, mode: taxiDirectoryMode })}
    </div>
  `;
}

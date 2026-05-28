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

export function renderShell(
  content,
  {
    language = 'en',
    languages = SUPPORTED_LANGUAGES,
    adSlots = {},
    datasetInfo = null,
    pwaControl = '',
    taxiDirectory = [],
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
          <a class="topbar-link" href="${FEEDBACK_FORM_URL}" target="_blank" rel="noreferrer">
            ${t('shell.feedback')}
          </a>
          <a class="topbar-link" href="${BRAND_SITE_URL}" target="_blank" rel="noreferrer">
            ${t('shell.officialSite')}
          </a>
          <label class="language-selector">
            <span>${t('shell.language')}</span>
            <select name="language" aria-label="${t('shell.language')}">
              ${renderLanguageOptions(languages, language)}
            </select>
          </label>
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
      ${renderTaxiOptionsSection(taxiDirectory, {
        t,
        titleKey: 'taxi.directoryTitle',
        bodyKey: 'taxi.directoryBody',
        className: 'taxi-directory-section',
      })}
    </div>
  `;
}

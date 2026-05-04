import {
  BRAND_LOCKUP_ALT,
  BRAND_LOCKUP_SRC,
  BRAND_SITE_URL,
  FEEDBACK_FORM_URL,
} from '../lib/brand.js';
import { createTranslator, SUPPORTED_LANGUAGES } from '../lib/i18n.js';

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

export function renderShell(
  content,
  {
    language = 'en',
    languages = SUPPORTED_LANGUAGES,
    datasetInfo = null,
    t = createTranslator('en'),
  } = {},
) {
  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand-lockup">
          <img
            class="brand-lockup-image"
            src="${BRAND_LOCKUP_SRC}"
            alt="${BRAND_LOCKUP_ALT}"
          />
          <p class="brand-subtitle">${t('shell.subtitle')}</p>
          ${renderFreshnessMarker(datasetInfo, t)}
        </div>
        <div class="topbar-actions">
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
      ${content}
    </div>
  `;
}

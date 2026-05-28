import { createTranslator } from '../lib/i18n.js';
import { renderTabLogo } from './renderLogos.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const TABS = ['search', 'trains', 'flixbus', 'blablacar', 'browse', 'saved'];

export function renderTabNav({ activeTab = 'search', t = createTranslator('en') } = {}) {
  return `
    <nav class="app-tabs" aria-label="${escapeHtml(t('tabs.label'))}">
      ${TABS.map((tab) => `
        <button
          type="button"
          class="app-tab ${activeTab === tab ? 'app-tab--active' : ''}"
          data-tab-target="${tab}"
          ${activeTab === tab ? 'aria-current="page"' : ''}
        >
          ${renderTabLogo(tab)}
          <span>${escapeHtml(t(`tabs.${tab}`))}</span>
        </button>
      `).join('')}
    </nav>
  `;
}

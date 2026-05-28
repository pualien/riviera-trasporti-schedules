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
      ${TABS.map((tab) => {
        const logo = renderTabLogo(tab);
        const tabClassName = [
          'app-tab',
          logo ? 'app-tab--with-logo' : 'app-tab--text-only',
          activeTab === tab ? 'app-tab--active' : '',
        ].filter(Boolean).join(' ');

        return `
        <button
          type="button"
          class="${tabClassName}"
          data-tab-target="${tab}"
          ${activeTab === tab ? 'aria-current="page"' : ''}
        >
          ${logo}
          <span>${escapeHtml(t(`tabs.${tab}`))}</span>
        </button>
      `;
      }).join('')}
    </nav>
  `;
}

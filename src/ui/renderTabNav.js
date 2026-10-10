import { createTranslator } from '../lib/i18n.js';
import { renderTabLogo } from './renderLogos.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const PRIMARY_TABS = ['search', 'browse', 'saved'];
const MORE_TABS = ['trains', 'flixbus', 'blablacar'];

function renderTabButton(tab, activeTab, t) {
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
}

export function renderTabNav({ activeTab = 'search', t = createTranslator('en') } = {}) {
  const moreTabIsActive = MORE_TABS.includes(activeTab);

  return `
    <nav class="app-tabs" aria-label="${escapeHtml(t('tabs.label'))}">
      ${PRIMARY_TABS.map((tab) => renderTabButton(tab, activeTab, t)).join('')}
      <details class="app-tab-more">
        <summary class="app-tab app-tab--text-only${moreTabIsActive ? ' app-tab--active' : ''}" ${moreTabIsActive ? 'aria-current="page"' : ''}>
          <span>${escapeHtml(t('tabs.moreTransport'))}</span>
          ${moreTabIsActive ? `<small>${escapeHtml(t(`tabs.${activeTab}`))}</small>` : ''}
        </summary>
        <div class="app-tab-more-panel">
          ${MORE_TABS.map((tab) => renderTabButton(tab, activeTab, t)).join('')}
        </div>
      </details>
    </nav>
  `;
}

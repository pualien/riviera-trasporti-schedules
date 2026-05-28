import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderPwaControl({
  pwaState = {},
  t = createTranslator('en'),
} = {}) {
  const installVisible = Boolean(pwaState.pwaSupported && pwaState.installAvailable && !pwaState.isInstalled);
  const updateVisible = Boolean(pwaState.pwaSupported && pwaState.updateAvailable);
  const offlineVisible = pwaState.isOnline === false;

  if (!installVisible && !updateVisible && !offlineVisible) {
    return '';
  }

  const classes = [
    'pwa-control',
    offlineVisible ? 'pwa-control--offline' : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="${classes}" data-pwa-control>
      ${offlineVisible ? `
        <span class="pwa-status" role="status">
          <strong>${escapeHtml(t('pwa.offline'))}</strong>
          <span>${escapeHtml(t('pwa.offlineDetail'))}</span>
        </span>
      ` : ''}
      ${installVisible ? `
        <button type="button" class="topbar-link pwa-action" data-pwa-install>
          ${escapeHtml(t('pwa.install'))}
        </button>
      ` : ''}
      ${updateVisible ? `
        <button type="button" class="topbar-link pwa-action" data-pwa-update>
          ${escapeHtml(t('pwa.update'))}
        </button>
      ` : ''}
    </div>
  `;
}

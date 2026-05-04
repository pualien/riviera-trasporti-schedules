import { createTranslator } from '../lib/i18n.js';

export function renderEmptyState(t = createTranslator('en'), message = t('empty.message')) {
  return `
    <section class="empty-state">
      <p class="eyebrow">${t('empty.eyebrow')}</p>
      <h2>${message}</h2>
      <p>${t('empty.guidance')}</p>
    </section>
  `;
}

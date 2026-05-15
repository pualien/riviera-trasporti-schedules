function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalizeSlotContent(content) {
  return typeof content === 'string' ? content.trim() : '';
}

export function renderAdSlot({ slotId, className = '', content = '' }) {
  const normalizedContent = normalizeSlotContent(content);

  if (!normalizedContent) {
    return '';
  }

  const classNames = ['ad-slot', className].filter(Boolean).join(' ');

  return `
    <aside class="${escapeHtml(classNames)}" data-ad-slot="${escapeHtml(slotId)}">
      ${normalizedContent}
    </aside>
  `;
}

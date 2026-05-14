import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function pageUrl(pdfUrl, sourcePage) {
  if (!sourcePage) {
    return pdfUrl;
  }

  return `${pdfUrl}#page=${sourcePage}`;
}

function renderLeg({ t, leg, pdfUrl }) {
  const label = `${t('results.line')} ${leg.lineId}`;

  return `
    <li>
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(leg.departureTime)} -> ${escapeHtml(leg.arrivalTime)}</span>
      <a class="topbar-link" href="${escapeHtml(pageUrl(pdfUrl, leg.sourcePage))}" target="_blank" rel="noreferrer">
        ${escapeHtml(t('results.openPdf'))}
      </a>
    </li>
  `;
}

function renderSuggestion({ t, suggestion, pdfUrl }) {
  return `
    <article class="transfer-suggestion">
      <div class="transfer-suggestion-head">
        <div>
          <h4>${escapeHtml(suggestion.transferStopName)}</h4>
          <p>${escapeHtml(t('transfer.wait', { minutes: suggestion.waitMinutes }))}</p>
        </div>
        <strong>${escapeHtml(`${suggestion.totalDurationMinutes} min`)}</strong>
      </div>
      <ol class="transfer-legs">
        ${renderLeg({ t, leg: suggestion.firstLeg, pdfUrl })}
        ${renderLeg({ t, leg: suggestion.secondLeg, pdfUrl })}
      </ol>
    </article>
  `;
}

export function renderTransferSuggestions({
  t = createTranslator('en'),
  suggestions = [],
  pdfUrl = '#',
} = {}) {
  return `
    <section class="transfer-suggestions">
      <div class="taxi-section-head">
        <h3>${escapeHtml(t('transfer.title'))}</h3>
        <p>${escapeHtml(t('transfer.subtitle'))}</p>
      </div>
      ${suggestions.length
    ? suggestions.map((suggestion) => renderSuggestion({ t, suggestion, pdfUrl })).join('')
    : `<p>${escapeHtml(t('transfer.unavailable'))}</p>`}
    </section>
  `;
}

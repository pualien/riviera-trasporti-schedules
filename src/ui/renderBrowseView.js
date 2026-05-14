import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderStopActions(stop, t) {
  return `
    <div class="browse-stop-actions">
      <button type="button" data-search-from-stop="${escapeHtml(stop.id)}">
        ${escapeHtml(t('browse.searchFromHere'))}
      </button>
      <button type="button" data-search-to-stop="${escapeHtml(stop.id)}">
        ${escapeHtml(t('browse.searchToHere'))}
      </button>
    </div>
  `;
}

function renderLineDetail({ selectedLine, t }) {
  if (!selectedLine) {
    return `<p>${escapeHtml(t('browse.selectLine'))}</p>`;
  }

  return `
    <div class="browse-detail">
      <h3>${escapeHtml(t('results.line'))} ${escapeHtml(selectedLine.lineId)}</h3>
      <ul>
        ${selectedLine.directions.map((direction) => `<li>${escapeHtml(direction)}</li>`).join('')}
      </ul>
      <div class="browse-stop-list">
        ${selectedLine.stops.map((stop) => `
          <div class="browse-stop-row">
            <strong>${escapeHtml(stop.canonical)}</strong>
            ${renderStopActions(stop, t)}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderStopDetail({ selectedStop, t }) {
  if (!selectedStop) {
    return `<p>${escapeHtml(t('browse.selectStop'))}</p>`;
  }

  return `
    <div class="browse-detail">
      <h3>${escapeHtml(selectedStop.canonical)}</h3>
      <ul>
        ${selectedStop.lines.map((lineId) => `
          <li>${escapeHtml(t('results.line'))} ${escapeHtml(lineId)}</li>
        `).join('')}
      </ul>
      ${renderStopActions(selectedStop, t)}
    </div>
  `;
}

function renderLineMode({ browseIndex, selectedLineId, t }) {
  const selectedLine = browseIndex.lines.find((line) => line.lineId === selectedLineId) ?? null;

  return `
    <div class="browse-layout">
      <div class="browse-list">
        ${browseIndex.lines.map((line) => `
          <button
            type="button"
            data-browse-line="${escapeHtml(line.lineId)}"
            ${line.lineId === selectedLineId ? 'aria-current="page"' : ''}
          >
            ${escapeHtml(t('results.line'))} ${escapeHtml(line.lineId)}
          </button>
        `).join('')}
      </div>
      ${renderLineDetail({ selectedLine, t })}
    </div>
  `;
}

function renderStopMode({ browseIndex, selectedStopId, t }) {
  const selectedStop = browseIndex.stops.find((stop) => stop.id === selectedStopId) ?? null;

  return `
    <div class="browse-layout">
      <div class="browse-list">
        ${browseIndex.stops.map((stop) => `
          <button
            type="button"
            data-browse-stop="${escapeHtml(stop.id)}"
            ${stop.id === selectedStopId ? 'aria-current="page"' : ''}
          >
            ${escapeHtml(stop.canonical)}
          </button>
        `).join('')}
      </div>
      ${renderStopDetail({ selectedStop, t })}
    </div>
  `;
}

export function renderBrowseView({
  t = createTranslator('en'),
  browseIndex = { lines: [], stops: [] },
  mode = 'lines',
  selectedLineId = null,
  selectedStopId = null,
} = {}) {
  const activeMode = mode === 'stops' ? 'stops' : 'lines';

  return `
    <section class="browse-view">
      <div>
        <p class="eyebrow">${escapeHtml(t('tabs.browse'))}</p>
        <h2>${escapeHtml(t('browse.title'))}</h2>
        <p>${escapeHtml(t('browse.subtitle'))}</p>
      </div>
      <div class="browse-mode-switch">
        <button type="button" data-browse-mode="lines" ${activeMode === 'lines' ? 'aria-current="page"' : ''}>
          ${escapeHtml(t('browse.lines'))}
        </button>
        <button type="button" data-browse-mode="stops" ${activeMode === 'stops' ? 'aria-current="page"' : ''}>
          ${escapeHtml(t('browse.stops'))}
        </button>
      </div>
      ${activeMode === 'lines'
        ? renderLineMode({ browseIndex, selectedLineId, t })
        : renderStopMode({ browseIndex, selectedStopId, t })}
    </section>
  `;
}

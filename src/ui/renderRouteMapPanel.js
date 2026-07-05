import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function mapMessage(t, mapState) {
  if (mapState.mapStatus === 'partial') {
    return t('results.mapPartial');
  }

  if (mapState.mapStatus === 'load-failed') {
    return `${t('results.mapLoadFailed')} ${t('results.mapLoadFailedDetail')}`;
  }

  if (mapState.mapStatus === 'unavailable') {
    return t('results.mapNoCoordinates');
  }

  return '';
}

function pdfHref(pdfUrl, sourcePage) {
  if (!pdfUrl || pdfUrl === '#') {
    return '#';
  }

  return sourcePage ? `${pdfUrl}#page=${sourcePage}` : pdfUrl;
}

export function renderRouteMapPanel({
  t = createTranslator('en'),
  match,
  mapState,
  pdfUrl = '#',
}) {
  const message = mapMessage(t, mapState);
  const duration = Number.isFinite(match.durationMinutes)
    ? `<span>${escapeHtml(match.durationMinutes)} min</span>`
    : '';

  return `
    <section class="route-map-panel" data-testid="route-map-panel">
      <div class="section-head">
        <p class="eyebrow">${escapeHtml(t('results.selectedTripMap'))}</p>
        <h3>${escapeHtml(t('results.selectedTripDetails'))}</h3>
        <p>${escapeHtml(t('results.selectedTripMapSubtitle'))}</p>
        <p class="route-map-precision">${escapeHtml(t('results.mapPrecision'))}</p>
      </div>
      <div class="route-map-meta">
        <strong>${escapeHtml(t('results.line'))} ${escapeHtml(match.lineId)}</strong>
        <span>${escapeHtml(match.departureTime)} &rarr; ${escapeHtml(match.arrivalTime)}</span>
        ${duration}
        <a href="${escapeHtml(pdfHref(pdfUrl, match.sourcePage))}" target="_blank" rel="noreferrer">${escapeHtml(t('results.openPdf'))}</a>
      </div>
      <div
        id="selected-trip-map"
        class="location-map"
        data-map-status="${escapeHtml(mapState.mapStatus)}"
      >
        ${mapState.hasMap ? '' : escapeHtml(message)}
      </div>
      ${mapState.hasMap && message ? `<p class="route-map-message">${escapeHtml(message)}</p>` : ''}
      <ol class="route-stop-list">
        ${mapState.stops.map((stop) => `<li>${escapeHtml(stop.time)} · ${escapeHtml(stop.label)}</li>`).join('')}
      </ol>
    </section>
  `;
}

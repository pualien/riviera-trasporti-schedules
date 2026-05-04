import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderRouteMapPanel({ t = createTranslator('en'), match, mapState }) {
  return `
    <section class="route-map-panel" data-testid="route-map-panel">
      <div class="section-head">
        <h3>Selected trip map</h3>
        <p>The exact direct trip segment you selected</p>
      </div>
      <div class="route-map-meta">
        <strong>${escapeHtml(t('results.line'))} ${escapeHtml(match.lineId)}</strong>
        <span>${escapeHtml(match.departureTime)} → ${escapeHtml(match.arrivalTime)}</span>
      </div>
      <div id="selected-trip-map" class="location-map">
        ${mapState.hasMap ? '' : 'Map unavailable for this trip'}
      </div>
      <ol class="route-stop-list">
        ${mapState.stops.map((stop) => `<li>${escapeHtml(stop.time)} · ${escapeHtml(stop.label)}</li>`).join('')}
      </ol>
    </section>
  `;
}

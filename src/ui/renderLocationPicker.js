import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDistance(distanceMeters) {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  return `${distanceMeters} m`;
}

export function renderLocationPicker({
  fieldName,
  state,
  nearbyStops = [],
  message = '',
  mapState = state === 'loading' ? 'loading' : 'ready',
  mapMessage = '',
  t = createTranslator('en'),
}) {
  const title = fieldName === 'to' ? t('location.title.to') : t('location.title.from');
  const escapedFieldName = escapeHtml(fieldName);

  if (state === 'error') {
    return `
      <section class="location-picker location-picker--error" data-field-name="${escapedFieldName}">
        <div class="location-picker-copy">
          <p class="eyebrow">${escapeHtml(t('location.eyebrow'))}</p>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(message)}</p>
          <p class="location-picker-message">${escapeHtml(t('location.manualSearch'))}</p>
        </div>
      </section>
    `;
  }

  const nearbyMarkup = state === 'ready' && nearbyStops.length
    ? nearbyStops
      .map(
        (stop) => `
          <button type="button" class="nearby-stop" data-stop-id="${escapeHtml(stop.stopId)}">
            <span>
              <strong>${escapeHtml(stop.canonical)}</strong>
              <small>${escapeHtml(stop.localityLabel ?? stop.label ?? stop.canonical)}</small>
            </span>
            <span>${escapeHtml(formatDistance(stop.distanceMeters))}</span>
          </button>
        `,
      )
      .join('')
    : state === 'loading'
      ? `<p class="location-picker-message">${escapeHtml(t('location.loading'))}</p>`
      : `<p class="location-picker-message">${escapeHtml(t('location.none'))}</p>`;
  const resolvedMapMessage = mapState === 'unavailable'
    ? (mapMessage || t('location.error.map'))
    : (state === 'loading' ? t('location.loadingMap') : '');

  return `
    <section class="location-picker" data-field-name="${escapedFieldName}">
      <div class="location-picker-copy">
        <p class="eyebrow">${escapeHtml(t('location.eyebrow'))}</p>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(t('location.guidance'))}</p>
      </div>
      <div class="location-map-shell">
        <div id="location-picker-map" class="location-map" data-map-status="${escapeHtml(mapState)}">${escapeHtml(resolvedMapMessage)}</div>
      </div>
      <div class="location-choices">
        <div class="section-head">
          <h3>${escapeHtml(t('location.nearestStops'))}</h3>
          <p>${escapeHtml(t('location.confirmExact'))}</p>
        </div>
        <div class="nearby-stop-list">
          ${nearbyMarkup}
        </div>
      </div>
    </section>
  `;
}

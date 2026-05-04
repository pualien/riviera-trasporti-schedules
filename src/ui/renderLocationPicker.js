import { createTranslator } from '../lib/i18n.js';

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
  t = createTranslator('en'),
}) {
  const title = fieldName === 'to' ? t('location.title.to') : t('location.title.from');

  if (state === 'error') {
    return `
      <section class="location-picker" data-field-name="${fieldName}">
        <div class="location-picker-copy">
          <p class="eyebrow">${t('location.eyebrow')}</p>
          <h3>${title}</h3>
          <p>${message}</p>
        </div>
      </section>
    `;
  }

  const nearbyMarkup = state === 'ready' && nearbyStops.length
    ? nearbyStops
      .map(
        (stop) => `
          <button type="button" class="nearby-stop" data-stop-id="${stop.stopId}">
            <span>
              <strong>${stop.canonical}</strong>
              <small>${stop.localityLabel ?? stop.label ?? stop.canonical}</small>
            </span>
            <span>${formatDistance(stop.distanceMeters)}</span>
          </button>
        `,
      )
      .join('')
    : state === 'loading'
      ? `<p class="location-picker-message">${t('location.loading')}</p>`
      : `<p class="location-picker-message">${t('location.none')}</p>`;

  return `
    <section class="location-picker" data-field-name="${fieldName}">
      <div class="location-picker-copy">
        <p class="eyebrow">${t('location.eyebrow')}</p>
        <h3>${title}</h3>
        <p>${t('location.guidance')}</p>
      </div>
      <div class="location-map-shell">
        <div id="location-picker-map" class="location-map">${state === 'loading' ? t('location.loadingMap') : ''}</div>
      </div>
      <div class="location-choices">
        <div class="section-head">
          <h3>${t('location.nearestStops')}</h3>
          <p>${t('location.confirmExact')}</p>
        </div>
        <div class="nearby-stop-list">
          ${nearbyMarkup}
        </div>
      </div>
    </section>
  `;
}

function formatDistance(distanceMeters) {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  return `${distanceMeters} m`;
}

export function renderLocationPicker({ fieldName, state, nearbyStops = [], message = '' }) {
  const title = fieldName === 'to' ? 'Choose a nearby destination stop' : 'Choose a nearby departure stop';

  if (state === 'error') {
    return `
      <section class="location-picker" data-field-name="${fieldName}">
        <div class="location-picker-copy">
          <p class="eyebrow">Nearby Stops</p>
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
              <small>${stop.label}</small>
            </span>
            <span>${formatDistance(stop.distanceMeters)}</span>
          </button>
        `,
      )
      .join('')
    : state === 'loading'
      ? '<p class="location-picker-message">Looking for the closest stops…</p>'
      : '<p class="location-picker-message">No matched nearby stops found yet.</p>';

  return `
    <section class="location-picker" data-field-name="${fieldName}">
      <div class="location-picker-copy">
        <p class="eyebrow">Nearby Stops</p>
        <h3>${title}</h3>
        <p>Google Maps-style nearby stop suggestions, but still tied back to the official timetable dataset.</p>
      </div>
      <div class="location-map-shell">
        <div id="location-picker-map" class="location-map">${state === 'loading' ? 'Loading map…' : ''}</div>
      </div>
      <div class="location-choices">
        <div class="section-head">
          <h3>Nearest stops</h3>
          <p>Pick one of the closest known stops for this field.</p>
        </div>
        <div class="nearby-stop-list">
          ${nearbyMarkup}
        </div>
      </div>
    </section>
  `;
}

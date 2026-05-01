import { buildRouteSummary, findDirectTrips } from './lib/query.js';
import {
  buildNearbyStopChoices,
  createNearbyStopCacheKey,
  fetchOverpassNearbyStops,
} from './lib/nearbyStops.js';
import { toMinutes } from './lib/time.js';
import { renderEmptyState } from './ui/renderEmptyState.js';
import { renderLocationPicker } from './ui/renderLocationPicker.js';
import { renderResultsView } from './ui/renderResults.js';
import { renderSearchForm } from './ui/renderSearchForm.js';

const app = document.querySelector('#app');
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

const state = {
  trips: [],
  stops: [],
  aliases: {},
  formValues: {
    from: 'Porto Maurizio',
    to: 'Sanremo',
    dayType: 'feriale',
  },
  resultState: null,
  locationPicker: null,
};

function currentMinutes() {
  const now = new Date();
  return (now.getHours() * 60) + now.getMinutes();
}

function nextDepartures(matches, count = 3) {
  const nowMinutes = currentMinutes();
  const upcoming = matches.filter((match) => toMinutes(match.departureTime) >= nowMinutes);
  const source = upcoming.length ? upcoming : matches;
  return source.slice(0, count);
}

function renderShell(content) {
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div>
          <p class="brand-kicker">Riviera Transit</p>
          <p class="brand-subtitle">Official PDF, clearer consultation</p>
        </div>
        <a class="topbar-link" href="https://rivieratrasporti.it/" target="_blank" rel="noreferrer">
          Riviera Trasporti
        </a>
      </header>
      ${content}
    </div>
  `;
}

function renderApp() {
  const parts = [renderSearchForm(state.formValues)];

  if (state.locationPicker) {
    parts.push(renderLocationPicker(state.locationPicker));
  }

  if (state.resultState?.type === 'results') {
    parts.push(
      renderResultsView({
        routeLabel: `${state.formValues.from} -> ${state.formValues.to}`,
        summary: state.resultState.summary,
        nextDepartures: state.resultState.nextDepartures,
        allDepartures: state.resultState.allDepartures,
      }),
    );
  }

  if (state.resultState?.type === 'empty') {
    parts.push(renderEmptyState(state.resultState.message));
  }

  renderShell(parts.join(''));
}

function readNearbyStopCache(latitude, longitude) {
  const cacheKey = createNearbyStopCacheKey(latitude, longitude);
  const rawValue = window.sessionStorage.getItem(`nearby-stops:${cacheKey}`);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function writeNearbyStopCache(latitude, longitude, nearbyStops) {
  const cacheKey = createNearbyStopCacheKey(latitude, longitude);
  window.sessionStorage.setItem(`nearby-stops:${cacheKey}`, JSON.stringify(nearbyStops));
}

async function ensureLeaflet() {
  if (window.L) {
    return window.L;
  }

  if (!document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS_URL;
    document.head.append(link);
  }

  await new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${LEAFLET_JS_URL}"]`);

    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      if (window.L) {
        resolve();
      }
      return;
    }

    const script = document.createElement('script');
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.append(script);
  });

  return window.L;
}

async function renderNearbyMap() {
  if (!state.locationPicker || state.locationPicker.state !== 'ready') {
    return;
  }

  const mapElement = document.querySelector('#location-picker-map');

  if (!mapElement || !state.locationPicker.coords) {
    return;
  }

  const L = await ensureLeaflet();
  const { latitude, longitude } = state.locationPicker.coords;

  if (mapElement._leaflet_id) {
    return;
  }

  const map = L.map(mapElement, {
    zoomControl: false,
    attributionControl: true,
  }).setView([latitude, longitude], 14);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  L.circleMarker([latitude, longitude], {
    radius: 8,
    color: '#0070f0',
    weight: 3,
    fillColor: '#0a84ff',
    fillOpacity: 0.35,
  }).addTo(map);

  for (const stop of state.locationPicker.nearbyStops) {
    L.marker([stop.latitude, stop.longitude]).addTo(map).bindPopup(stop.canonical);
  }
}

function bindNearbyStopSelection() {
  document.querySelectorAll('.nearby-stop').forEach((button) => {
    button.addEventListener('click', () => {
      const selectedStop = state.locationPicker?.nearbyStops.find(
        (stop) => stop.stopId === button.dataset.stopId,
      );

      if (!selectedStop || !state.locationPicker) {
        return;
      }

      state.formValues = {
        ...state.formValues,
        [state.locationPicker.fieldName]: selectedStop.canonical,
      };
      state.locationPicker = null;
      renderApp();
      bindInteractions();
    });
  });
}

async function openLocationPicker(fieldName) {
  state.locationPicker = {
    fieldName,
    state: 'loading',
    nearbyStops: [],
    message: '',
  };
  renderApp();
  bindInteractions();

  if (!navigator.geolocation) {
    state.locationPicker = {
      fieldName,
      state: 'error',
      message: 'This browser cannot share your location. Type the stop name manually instead.',
    };
    renderApp();
    bindInteractions();
    return;
  }

  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    try {
      const cachedNearbyStops = readNearbyStopCache(coords.latitude, coords.longitude);
      const nearbyStops = cachedNearbyStops ?? await buildNearbyStopChoices({
        latitude: coords.latitude,
        longitude: coords.longitude,
        stops: state.stops,
        aliases: state.aliases,
        fetchNearbyStops: fetchOverpassNearbyStops,
        limit: 5,
      });

      writeNearbyStopCache(coords.latitude, coords.longitude, nearbyStops);

      state.locationPicker = nearbyStops.length
        ? {
          fieldName,
          state: 'ready',
          nearbyStops,
          coords: {
            latitude: coords.latitude,
            longitude: coords.longitude,
          },
        }
        : {
          fieldName,
          state: 'error',
          nearbyStops: [],
          message: 'No nearby timetable stops could be matched from the live map provider.',
        };
    } catch (error) {
      state.locationPicker = {
        fieldName,
        state: 'error',
        nearbyStops: [],
        message: 'Nearby stop lookup failed. Type the stop name manually instead.',
      };
      console.error(error);
    }

    renderApp();
    bindInteractions();
    if (state.locationPicker?.state === 'ready') {
      await renderNearbyMap();
      bindNearbyStopSelection();
    }
  }, () => {
    state.locationPicker = {
      fieldName,
      state: 'error',
      nearbyStops: [],
      message: 'Location access was denied. Type the stop name manually instead.',
    };
    renderApp();
    bindInteractions();
  });
}

function bindForm() {
  const form = document.querySelector('#route-form');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    state.formValues = {
      from: String(formData.get('from') ?? ''),
      to: String(formData.get('to') ?? ''),
      dayType: String(formData.get('dayType') ?? 'feriale'),
    };

    const matches = findDirectTrips({
      from: state.formValues.from,
      to: state.formValues.to,
      dayType: state.formValues.dayType,
      aliases: state.aliases,
      trips: state.trips,
    });

    if (!matches.length) {
      state.resultState = {
        type: 'empty',
        message: 'Try another stop alias, browse the official PDF, or adjust the day type.',
      };
      state.locationPicker = null;
      renderApp();
      bindInteractions();
      return;
    }

    state.resultState = {
      type: 'results',
      summary: buildRouteSummary(matches),
      nextDepartures: nextDepartures(matches),
      allDepartures: matches,
    };
    state.locationPicker = null;
    renderApp();
    bindInteractions();
  });
}

function bindLocationActions() {
  document.querySelectorAll('.field-location-button').forEach((button) => {
    button.addEventListener('click', () => {
      openLocationPicker(button.dataset.locationField);
    });
  });
}

function bindInteractions() {
  bindForm();
  bindLocationActions();
}

async function boot() {
  try {
    const [trips, stops] = await Promise.all([
      fetch('./assets/data/trips.json').then((response) => response.json()),
      fetch('./assets/data/stops.json').then((response) => response.json()),
    ]);

    state.trips = trips;
    state.stops = stops;
    state.aliases = Object.fromEntries(stops.map((stop) => [stop.canonical, stop.variants]));

    renderApp();
    bindInteractions();
  } catch (error) {
    renderShell(
      renderEmptyState(
        'The timetable data is not available yet. Run the static data build before publishing this page.',
      ),
    );
    console.error(error);
  }
}

boot();

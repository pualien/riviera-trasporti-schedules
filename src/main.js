import { buildRouteSummary, findDirectTrips } from './lib/query.js';
import { findExactLocalityMatch, findExactStopMatch, findMatchingLocalities } from './lib/localities.js';
import {
  buildNearbyStopChoices,
  createNearbyStopCacheKey,
  fetchOverpassNearbyStops,
} from './lib/nearbyStops.js';
import { normalizeText } from './lib/normalize.js';
import { selectLocality, selectOriginStop } from './lib/routePickerState.js';
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
  localities: [],
  reachability: {},
  aliases: {},
  uiState: {
    fromPanelOpen: false,
    toPanelOpen: false,
  },
  formValues: {
    fromInput: '',
    fromLocalityId: null,
    fromStopId: null,
    toInput: '',
    toStopId: null,
    dayType: 'feriale',
  },
  pickerState: {
    exactStopChoices: [],
    reachableDestinations: [],
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

function buildReachabilityFromTrips(trips) {
  const reachability = {};

  for (const trip of trips) {
    for (let fromIndex = 0; fromIndex < trip.stops.length; fromIndex += 1) {
      const fromStopId = trip.stops[fromIndex].stopId;
      const reachable = reachability[fromStopId] ?? new Set();

      for (let toIndex = fromIndex + 1; toIndex < trip.stops.length; toIndex += 1) {
        reachable.add(trip.stops[toIndex].stopId);
      }

      reachability[fromStopId] = reachable;
    }
  }

  return Object.fromEntries(
    Object.entries(reachability).map(([stopId, destinations]) => [stopId, [...destinations].sort()]),
  );
}

async function fetchJsonOrNull(url) {
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  return response.json();
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
  const exactFromStop = state.stops.find((stop) => stop.id === state.formValues.fromStopId) ?? null;
  const parts = [renderSearchForm({
    fromInput: state.formValues.fromInput,
    exactFromStop,
    fromSuggestions: currentFromSuggestions(),
    fromPanelOpen: state.uiState.fromPanelOpen,
    toInput: state.formValues.toInput,
    toPanelOpen: state.uiState.toPanelOpen,
    reachableDestinations: currentDestinationOptions(),
    destinationMode: currentDestinationMode(),
    destinationMessage: currentDestinationMessage(),
    dayType: state.formValues.dayType,
  })];

  if (state.locationPicker) {
    parts.push(renderLocationPicker(state.locationPicker));
  }

  if (state.resultState?.type === 'results') {
    parts.push(
      renderResultsView({
        routeLabel: `${state.formValues.fromInput} -> ${state.formValues.toInput}`,
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

function resetDestinationState() {
  state.formValues = {
    ...state.formValues,
    toInput: '',
    toStopId: null,
  };
  state.resultState = null;
}

function currentFromSuggestions() {
  if (state.formValues.fromStopId) {
    return state.localities.map((locality) => ({
      value: locality.label,
      meta: 'Area',
    }));
  }

  const query = normalizeText(state.formValues.fromInput);

  if (state.formValues.fromLocalityId && !state.formValues.fromStopId) {
    return state.pickerState.exactStopChoices
      .filter((stop) => !query || normalizeText(stop.canonical).includes(query))
      .map((stop) => ({
        value: stop.canonical,
        meta: 'Exact stop',
      }));
  }

  const matchingLocalities = query ? findMatchingLocalities(state.formValues.fromInput, state.localities) : state.localities;
  return matchingLocalities.map((locality) => ({
    value: locality.label,
    meta: 'Area',
  }));
}

function currentDestinationMode() {
  if (!state.formValues.fromLocalityId) {
    return 'informational';
  }

  if (state.pickerState.reachableDestinations.length === 0) {
    return 'empty';
  }

  return state.formValues.fromStopId ? 'exact-stop-destinations' : 'locality-destinations';
}

function currentDestinationMessage() {
  const mode = currentDestinationMode();

  if (mode === 'informational') {
    return 'Choose a departure area first to see direct destinations.';
  }

  if (mode === 'empty') {
    return state.formValues.fromStopId
      ? 'No direct destinations found from this exact stop for the selected day type.'
      : 'No direct destinations found from this area for the selected day type.';
  }

  return state.formValues.fromStopId
    ? 'Direct destinations from this stop'
    : 'Direct destinations from this area';
}

function currentDestinationOptions() {
  const query = normalizeText(state.formValues.toInput);

  return state.pickerState.reachableDestinations.filter(
    (stop) => !query || normalizeText(stop.canonical).includes(query),
  );
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

      if (state.locationPicker.fieldName === 'from') {
        if (selectedStop.localityId) {
          const locality = state.localities.find((entry) => entry.id === selectedStop.localityId);
          if (locality) {
            selectFromLocalityChoice(locality);
          }
        }

        const stop = state.stops.find((entry) => entry.id === selectedStop.stopId);
        if (stop) {
          selectFromStopChoice(stop);
        }
      } else {
        state.formValues = {
          ...state.formValues,
          toInput: selectedStop.canonical,
          toStopId: selectedStop.stopId,
        };
      }

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
        localities: state.localities,
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
      ...state.formValues,
      fromInput: String(formData.get('from') ?? ''),
      toInput: String(formData.get('to') ?? ''),
      dayType: String(formData.get('dayType') ?? 'feriale'),
    };

    const matches = findDirectTrips({
      from: state.formValues.fromInput,
      to: state.formValues.toInput,
      fromStopId: state.formValues.fromStopId,
      fromLocalityStopIds: state.formValues.fromStopId
        ? []
        : (state.localities.find((locality) => locality.id === state.formValues.fromLocalityId)?.stopIds ?? []),
      toStopId: state.formValues.toStopId,
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

function selectFromLocalityChoice(locality) {
  resetDestinationState();
  Object.assign(state, selectLocality(state, locality, state.stops, state.reachability));
  state.uiState.fromPanelOpen = true;
  state.uiState.toPanelOpen = false;
}

function selectFromStopChoice(stop) {
  resetDestinationState();
  Object.assign(state, selectOriginStop(state, stop, state.reachability, state.stops));
  state.uiState.fromPanelOpen = false;
  state.uiState.toPanelOpen = true;
}

function focusFromInput(selectText = false) {
  const fromInput = document.querySelector('input[name="from"]');

  if (!fromInput) {
    return;
  }

  fromInput.focus();

  if (selectText) {
    fromInput.setSelectionRange(0, fromInput.value.length);
  }
}

function clearFromSelection(nextValue) {
  resetDestinationState();
  state.formValues = {
    ...state.formValues,
    fromInput: nextValue,
    fromLocalityId: null,
    fromStopId: null,
  };
  state.pickerState = {
    ...state.pickerState,
    exactStopChoices: [],
    reachableDestinations: [],
  };
}

function bindFieldPanels() {
  const fromInput = document.querySelector('[data-field="from"]');
  const toInput = document.querySelector('[data-field="to"]');

  fromInput?.addEventListener('focus', () => {
    if (state.uiState.fromPanelOpen) {
      return;
    }

    state.uiState.fromPanelOpen = true;
    state.uiState.toPanelOpen = false;
    renderApp();
    bindInteractions();
    focusFromInput();
  });

  fromInput?.addEventListener('input', (event) => {
    const nextValue = String(event.currentTarget.value ?? '');
    const shouldClearLocality = Boolean(state.formValues.fromStopId) || nextValue === '';

    state.formValues = {
      ...state.formValues,
      fromInput: nextValue,
      fromLocalityId: shouldClearLocality ? null : state.formValues.fromLocalityId,
      fromStopId: null,
    };
    state.formValues.toInput = '';
    state.formValues.toStopId = null;
    state.resultState = null;
    state.uiState.fromPanelOpen = true;
    state.uiState.toPanelOpen = false;

    if (shouldClearLocality) {
      state.pickerState = {
        ...state.pickerState,
        exactStopChoices: [],
        reachableDestinations: [],
      };
    }

    renderApp();
    bindInteractions();
    focusFromInput();
  });

  toInput?.addEventListener('focus', () => {
    if (state.uiState.toPanelOpen) {
      return;
    }

    state.uiState.fromPanelOpen = false;
    state.uiState.toPanelOpen = true;
    renderApp();
    bindInteractions();
    document.querySelector('[data-field="to"]')?.focus();
  });

  toInput?.addEventListener('input', (event) => {
    state.formValues = {
      ...state.formValues,
      toInput: String(event.currentTarget.value ?? ''),
      toStopId: null,
    };
    state.resultState = null;
    state.uiState.toPanelOpen = true;
    renderApp();
    bindInteractions();
    document.querySelector('[data-field="to"]')?.focus();
  });

  document.querySelectorAll('[data-from-value]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.fromValue ?? '';
      const exactStopChoice = state.formValues.fromLocalityId
        ? findExactStopMatch(value, state.pickerState.exactStopChoices)
        : null;

      if (exactStopChoice) {
        selectFromStopChoice(exactStopChoice);
      } else {
        const localityChoice = findExactLocalityMatch(value, state.localities);

        if (!localityChoice) {
          clearFromSelection(value);
        } else {
          selectFromLocalityChoice(localityChoice);
        }
      }

      renderApp();
      bindInteractions();
      if (state.uiState.fromPanelOpen) {
        focusFromInput(true);
      }
    });
  });

  document.querySelectorAll('[data-to-value]').forEach((button) => {
    button.addEventListener('click', () => {
      state.formValues = {
        ...state.formValues,
        toInput: button.dataset.toValue ?? '',
        toStopId: button.dataset.stopId ?? null,
      };
      state.resultState = null;
      state.uiState.toPanelOpen = false;
      renderApp();
      bindInteractions();
    });
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
  bindFieldPanels();
  bindLocationActions();
}

async function boot() {
  try {
    const [trips, stops, generatedLocalities, generatedReachability, manualLocalities] = await Promise.all([
      fetch('./assets/data/trips.json').then((response) => response.json()),
      fetch('./assets/data/stops.json').then((response) => response.json()),
      fetchJsonOrNull('./assets/data/localities.json'),
      fetchJsonOrNull('./assets/data/reachability.json'),
      fetchJsonOrNull('./data/manual/localities.json'),
    ]);

    state.trips = trips;
    state.stops = stops;
    state.localities = generatedLocalities ?? manualLocalities ?? [];
    state.reachability = generatedReachability ?? buildReachabilityFromTrips(trips);
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

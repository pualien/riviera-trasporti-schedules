import { pushRouteSearchEvent } from './lib/analytics.js';
import { loadAppBootstrapData } from './lib/appBootstrap.js';
import { buildBrowseIndex } from './lib/browseIndex.js';
import { buildFromSuggestionSections } from './lib/fromSuggestions.js';
import { findDirectTrips, resolveRouteStopIds } from './lib/query.js';
import {
  findExactLocalityMatch,
  findExactStopMatch,
  getLocalityReachableStops,
  getLocalityStops,
  getReachableStops,
} from './lib/localities.js';
import {
  buildNearbyStopChoices,
  createNearbyStopCacheKey,
  fetchOverpassNearbyStops,
} from './lib/nearbyStops.js';
import { buildRouteMapState } from './lib/routeMap.js';
import { buildSearchOutcome } from './lib/searchOutcome.js';
import { findOneTransferSuggestions } from './lib/transferSuggestions.js';
import {
  addFavoriteRoute,
  addRecentRoute,
  getSavedRoutesStorage,
  readSavedRoutes,
  removeFavoriteRoute,
} from './lib/savedRoutes.js';
import { listTaxiOptions } from './lib/taxiDirectory.js';
import {
  SUPPORTED_LANGUAGES,
  createTranslator,
  persistLanguage,
  readStoredLanguage,
} from './lib/i18n.js';
import { normalizeText } from './lib/normalize.js';
import { registerServiceWorker } from './lib/registerServiceWorker.js';
import {
  hydrateSearchStateFromUrl,
  hydrateSearchStateFromRouteSnapshot,
  parseRouteUrlState,
  serializeRouteUrlState,
  shouldRunSearchFromRouteState,
} from './lib/routeUrlState.js';
import {
  applySeoMetadata,
  buildDefaultSeoMetadata,
  buildRouteSeoMetadata,
} from './lib/seo.js';
import { findTaxiOptionsForRoute } from './lib/routeTaxiOptions.js';
import { seedOriginStopFromBrowse, selectLocality, selectOriginStop } from './lib/routePickerState.js';
import { renderEmptyState } from './ui/renderEmptyState.js';
import { renderLocationPicker } from './ui/renderLocationPicker.js';
import { renderNoDirectFallback } from './ui/renderNoDirectFallback.js';
import { renderRouteMapPanel } from './ui/renderRouteMapPanel.js';
import { renderSavedView } from './ui/renderSavedView.js';
import { renderBrowseView } from './ui/renderBrowseView.js';
import { renderResultsView } from './ui/renderResults.js';
import { renderSearchForm } from './ui/renderSearchForm.js';
import { renderShell } from './ui/renderShell.js';
import { renderTabNav } from './ui/renderTabNav.js';

const app = document.querySelector('#app');
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function savedRoutesStorage() {
  return getSavedRoutesStorage(window);
}

const state = {
  trips: [],
  stops: [],
  stopCoordinates: {},
  localities: [],
  reachability: {},
  aliases: {},
  metadata: null,
  language: readStoredLanguage(window.localStorage),
  activeTab: 'search',
  savedRoutes: { favorites: [], recents: [], available: true },
  browseIndex: { lines: [], stops: [] },
  browseState: {
    mode: 'lines',
    lineId: null,
    stopId: null,
  },
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
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    return null;
  }
}

function currentSelectedTripMatch() {
  if (state.resultState?.type !== 'results' || !state.resultState.selectedTripKey) {
    return null;
  }

  return state.resultState.allDepartures.find((departure) => departure.tripKey === state.resultState.selectedTripKey) ?? null;
}

function currentSelectedTripPanel(t) {
  const selectedTripMatch = currentSelectedTripMatch();

  if (!selectedTripMatch) {
    return '';
  }

  return renderRouteMapPanel({
    t,
    match: selectedTripMatch,
    pdfUrl: state.metadata?.source?.url ?? '#',
    mapState: buildRouteMapState(
      selectedTripMatch,
      state.stopCoordinates,
      {
        mapLoadFailed: state.resultState?.selectedTripMapLoadFailed === true,
      },
    ),
  });
}

function currentRouteTaxiOptions() {
  return findTaxiOptionsForRoute({
    fromInput: state.formValues.fromInput,
    fromStopId: state.formValues.fromStopId,
    toInput: state.formValues.toInput,
    toStopId: state.formValues.toStopId,
    stops: state.stops,
  });
}

function currentLocalityStopIds() {
  return state.localities.find((locality) => locality.id === state.formValues.fromLocalityId)?.stopIds ?? [];
}

function currentResolvedRouteStopIds() {
  return resolveRouteStopIds({
    from: state.formValues.fromInput,
    to: state.formValues.toInput,
    fromStopId: state.formValues.fromStopId,
    fromLocalityStopIds: state.formValues.fromStopId ? [] : currentLocalityStopIds(),
    toStopId: state.formValues.toStopId,
    aliases: state.aliases,
  });
}

function currentRouteUrlState() {
  return {
    tab: state.activeTab,
    search: state.formValues,
    browse: state.browseState,
  };
}

function currentSavedRouteSnapshot({ resultType = null, resultCount = 0 } = {}) {
  return {
    ...state.formValues,
    resultType,
    resultCount,
    timestamp: new Date().toISOString(),
  };
}

function writeRouteUrl({ push = false } = {}) {
  const params = serializeRouteUrlState(currentRouteUrlState());
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  const method = push ? 'pushState' : 'replaceState';

  window.history[method](currentRouteUrlState(), '', nextUrl);
}

function hydrateRouteStateFromUrl() {
  const routeUrlState = parseRouteUrlState(window.location.search);

  state.activeTab = routeUrlState.tab;
  state.formValues = hydrateSearchStateFromUrl({
    currentFormValues: state.formValues,
    urlSearchState: routeUrlState.search,
    search: window.location.search,
    stops: state.stops,
    localities: state.localities,
  });
  state.browseState = routeUrlState.browse;
  state.resultState = null;
  state.locationPicker = null;
  state.pickerState = {
    exactStopChoices: [],
    reachableDestinations: [],
  };

  if (state.formValues.fromStopId) {
    state.pickerState = {
      ...state.pickerState,
      reachableDestinations: getReachableStops(state.formValues.fromStopId, state.reachability, state.stops),
    };
    return;
  }

  if (state.formValues.fromLocalityId) {
    state.pickerState = {
      ...state.pickerState,
      exactStopChoices: getLocalityStops(state.formValues.fromLocalityId, state.localities, state.stops),
      reachableDestinations: getLocalityReachableStops(
        state.formValues.fromLocalityId,
        state.localities,
        state.reachability,
        state.stops,
      ),
    };
  }
}

function restoreSearchResultsIfReady() {
  if (!shouldRunSearchFromRouteState({
    tab: state.activeTab,
    search: state.formValues,
  })) {
    return false;
  }

  submitCurrentSearch();
  return true;
}

function updateSeoForCurrentState(t) {
  if (!state.formValues.fromInput || !state.formValues.toInput) {
    applySeoMetadata(document, buildDefaultSeoMetadata());
    return;
  }

  applySeoMetadata(document, buildRouteSeoMetadata({
    from: state.formValues.fromInput,
    to: state.formValues.toInput,
    dayTypeLabel: t(`search.dayType.${state.formValues.dayType}`),
  }));
}

function renderApp() {
  const t = createTranslator(state.language);
  const exactFromStop = state.stops.find((stop) => stop.id === state.formValues.fromStopId) ?? null;
  const selectedLocality = state.localities.find((locality) => locality.id === state.formValues.fromLocalityId) ?? null;
  const destinationOptions = currentDestinationOptions();
  const taxiOptions = currentRouteTaxiOptions();
  const parts = [];

  if (state.activeTab === 'browse') {
    parts.push(renderBrowseView({
      t,
      browseIndex: state.browseIndex,
      mode: state.browseState.mode,
      selectedLineId: state.browseState.lineId,
      selectedStopId: state.browseState.stopId,
    }));
  } else if (state.activeTab === 'saved') {
    parts.push(renderSavedView({
      t,
      favorites: state.savedRoutes.favorites,
      recents: state.savedRoutes.recents,
      available: state.savedRoutes.available,
    }));
  } else {
    parts.push(renderSearchForm({
      t,
      fromInput: state.formValues.fromInput,
      fromLocalitySelected: Boolean(state.formValues.fromLocalityId),
      exactFromStop,
      fromSuggestions: currentFromSuggestions(t),
      fromPanelOpen: state.uiState.fromPanelOpen,
      toInput: state.formValues.toInput,
      toStopSelected: Boolean(state.formValues.toStopId),
      toPanelOpen: state.uiState.toPanelOpen,
      reachableDestinations: destinationOptions,
      destinationMode: currentDestinationMode(),
      destinationMessage: currentDestinationMessage(t),
      selectedLocalityLabel: selectedLocality?.label ?? '',
      dayType: state.formValues.dayType,
    }));
  }

  if (state.activeTab === 'search' && state.locationPicker) {
    parts.push(renderLocationPicker({
      ...state.locationPicker,
      message: state.locationPicker.messageKey ? t(state.locationPicker.messageKey) : state.locationPicker.message,
      t,
    }));
  }

  if (state.activeTab === 'search' && state.resultState?.type === 'results') {
    parts.push(
      renderResultsView({
        t,
        routeLabel: `${state.formValues.fromInput} -> ${state.formValues.toInput}`,
        pdfUrl: state.metadata?.source?.url ?? '#',
        summary: state.resultState.summary,
        nextDepartures: state.resultState.nextDepartures,
        allDepartures: state.resultState.allDepartures,
        taxiOptions,
        selectedTripKey: state.resultState.selectedTripKey,
        selectedTripPanel: currentSelectedTripPanel(t),
      }),
    );
  }

  if (state.activeTab === 'search' && state.resultState?.type === 'no-direct') {
    parts.push(renderNoDirectFallback({
      t,
      routeLabel: `${state.formValues.fromInput} -> ${state.formValues.toInput}`,
      pdfUrl: state.metadata?.source?.url ?? '#',
      suggestions: state.resultState.suggestions,
      transferSuggestions: state.resultState.transferSuggestions ?? [],
      taxiOptions,
    }));
  }

  app.innerHTML = renderShell(parts.join(''), {
    language: state.language,
    languages: SUPPORTED_LANGUAGES,
    datasetInfo: state.metadata,
    taxiDirectory: listTaxiOptions(),
    tabNavigation: renderTabNav({ activeTab: state.activeTab, t }),
    t,
  });
  updateSeoForCurrentState(t);
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

function currentFromSuggestions(t) {
  const selectedLocalityLabel = state.localities.find((locality) => locality.id === state.formValues.fromLocalityId)?.label ?? '';
  const sections = buildFromSuggestionSections({
    inputValue: state.formValues.fromInput,
    localities: state.localities,
    selectedLocalityLabel,
    exactStopChoices: state.pickerState.exactStopChoices,
  });

  return {
    areas: sections.areas.map((entry) => ({ ...entry, meta: t('search.panel.area') })),
    exactStops: sections.exactStops.map((entry) => ({ ...entry, meta: t('search.panel.exactStop') })),
    exactStopHeading: sections.exactStopHeading,
  };
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

function currentDestinationMessage(t) {
  const mode = currentDestinationMode();

  if (mode === 'informational') {
    return t('search.destination.informational');
  }

  if (mode === 'empty') {
    return state.formValues.fromStopId
      ? t('search.destination.emptyStop')
      : t('search.destination.emptyLocality');
  }

  return state.formValues.fromStopId
    ? t('search.destination.fromStop')
    : t('search.destination.fromArea');
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

async function renderSelectedTripMap(mapState) {
  if (!mapState.hasMap) {
    return false;
  }

  const mapElement = document.querySelector('#selected-trip-map');

  if (!mapElement || mapElement._leaflet_id) {
    return true;
  }

  try {
    const L = await ensureLeaflet();
    const coordinates = mapState.points.map((point) => [point.latitude, point.longitude]);
    const map = L.map(mapElement, {
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    L.polyline(coordinates, {
      color: '#d93b4f',
      weight: 4,
    }).addTo(map);

    mapState.points.forEach((point) => {
      L.marker([point.latitude, point.longitude]).addTo(map).bindPopup(`${point.time} · ${point.label}`);
    });

    map.fitBounds(coordinates, { padding: [24, 24] });
    return true;
  } catch (error) {
    console.error(error);
    return false;
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
      writeRouteUrl({ push: false });
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
    messageKey: '',
  };
  renderApp();
  bindInteractions();

  if (!navigator.geolocation) {
    state.locationPicker = {
      fieldName,
      state: 'error',
      messageKey: 'location.error.browser',
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
          messageKey: 'location.error.nomatch',
        };
    } catch (error) {
      state.locationPicker = {
        fieldName,
        state: 'error',
        nearbyStops: [],
        messageKey: 'location.error.lookup',
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
      messageKey: 'location.error.denied',
    };
    renderApp();
    bindInteractions();
  });
}

function submitCurrentSearch() {
  const routeStopIds = currentResolvedRouteStopIds();
  const matches = findDirectTrips({
    from: state.formValues.fromInput,
    to: state.formValues.toInput,
    fromStopId: state.formValues.fromStopId,
    fromLocalityStopIds: state.formValues.fromStopId
      ? []
      : currentLocalityStopIds(),
    toStopId: state.formValues.toStopId,
    dayType: state.formValues.dayType,
    aliases: state.aliases,
    trips: state.trips,
  });

  const outcome = buildSearchOutcome({
    matches,
    now: new Date(),
    fromLocalityId: state.formValues.fromLocalityId,
    fromStopId: state.formValues.fromStopId,
    localities: state.localities,
    reachability: state.reachability,
    stops: state.stops,
  });

  if (outcome.type === 'no-direct') {
    outcome.transferSuggestions = findOneTransferSuggestions({
      trips: state.trips,
      fromStopIds: routeStopIds.originStopIds,
      toStopId: routeStopIds.destinationStopId,
      dayType: state.formValues.dayType,
      now: new Date(),
    });
  }

  state.resultState = outcome.type === 'results'
    ? { ...outcome, selectedTripKey: null }
    : outcome;

  return { matches, outcome };
}

function bindForm() {
  const form = document.querySelector('#route-form');

  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    state.formValues = {
      ...state.formValues,
      fromInput: String(formData.get('from') ?? ''),
      toInput: String(formData.get('to') ?? ''),
      dayType: String(formData.get('dayType') ?? 'feriale'),
    };

    const { matches, outcome } = submitCurrentSearch();

    pushRouteSearchEvent(window, {
      from: state.formValues.fromInput,
      to: state.formValues.toInput,
      dayType: state.formValues.dayType,
      resultsCount: matches.length,
    });

    state.savedRoutes = addRecentRoute(savedRoutesStorage(), currentSavedRouteSnapshot({
      resultType: outcome.type,
      resultCount: matches.length,
    }));
    state.locationPicker = null;
    writeRouteUrl({ push: false });
    renderApp();
    bindInteractions();
  });
}

function bindNoDirectActions() {
  document.querySelectorAll('[data-no-direct-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const stop = state.stops.find((entry) => entry.id === button.dataset.stopId);

      if (!stop) {
        return;
      }

      if (button.dataset.noDirectAction === 'set-origin-stop') {
        Object.assign(state, selectOriginStop(
          state,
          stop,
          state.reachability,
          state.stops,
          { preserveDestination: true },
        ));
        state.uiState.fromPanelOpen = false;
        state.uiState.toPanelOpen = true;
      }

      if (button.dataset.noDirectAction === 'set-destination-stop') {
        state.formValues = {
          ...state.formValues,
          toInput: stop.canonical,
          toStopId: stop.id,
        };
      }

      state.activeTab = 'search';
      submitCurrentSearch();
      writeRouteUrl({ push: true });
      renderApp();
      bindInteractions();
    });
  });
}

function seedSearchStop(stopId, fieldName) {
  const stop = state.stops.find((entry) => entry.id === stopId);

  if (!stop) {
    return;
  }

  state.activeTab = 'search';

  if (fieldName === 'from') {
    Object.assign(state, seedOriginStopFromBrowse(state, stop, state.reachability, state.stops));
    state.resultState = null;
    state.uiState.fromPanelOpen = false;
    state.uiState.toPanelOpen = true;
  } else {
    state.formValues = {
      ...state.formValues,
      toInput: stop.canonical,
      toStopId: stop.id,
    };
    state.resultState = null;
  }

  writeRouteUrl({ push: true });
  restoreSearchResultsIfReady();
  renderApp();
  bindInteractions();
}

function bindBrowseActions() {
  document.querySelectorAll('[data-browse-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      state.browseState = {
        ...state.browseState,
        mode: button.dataset.browseMode ?? 'lines',
      };
      writeRouteUrl({ push: true });
      renderApp();
      bindInteractions();
    });
  });

  document.querySelectorAll('[data-browse-line]').forEach((button) => {
    button.addEventListener('click', () => {
      state.browseState = {
        ...state.browseState,
        mode: 'lines',
        lineId: button.dataset.browseLine,
      };
      writeRouteUrl({ push: true });
      renderApp();
      bindInteractions();
    });
  });

  document.querySelectorAll('[data-browse-stop]').forEach((button) => {
    button.addEventListener('click', () => {
      state.browseState = {
        ...state.browseState,
        mode: 'stops',
        stopId: button.dataset.browseStop,
      };
      writeRouteUrl({ push: true });
      renderApp();
      bindInteractions();
    });
  });

  document.querySelectorAll('[data-search-from-stop]').forEach((button) => {
    button.addEventListener('click', () => seedSearchStop(button.dataset.searchFromStop, 'from'));
  });

  document.querySelectorAll('[data-search-to-stop]').forEach((button) => {
    button.addEventListener('click', () => seedSearchStop(button.dataset.searchToStop, 'to'));
  });
}

function selectFromLocalityChoice(locality) {
  resetDestinationState();
  Object.assign(state, selectLocality(state, locality, state.stops, state.reachability));
  state.uiState.fromPanelOpen = true;
  state.uiState.toPanelOpen = false;
  writeRouteUrl({ push: false });
}

function selectFromStopChoice(stop) {
  resetDestinationState();
  Object.assign(state, selectOriginStop(state, stop, state.reachability, state.stops));
  state.uiState.fromPanelOpen = false;
  state.uiState.toPanelOpen = true;
  writeRouteUrl({ push: false });
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
  writeRouteUrl({ push: false });
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
    const selectedLocality = state.localities.find((locality) => locality.id === state.formValues.fromLocalityId) ?? null;
    const shouldClearLocality = Boolean(state.formValues.fromStopId)
      || nextValue === ''
      || (selectedLocality && normalizeText(nextValue) !== normalizeText(selectedLocality.label));

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

    writeRouteUrl({ push: false });
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
    writeRouteUrl({ push: false });
    renderApp();
    bindInteractions();
    document.querySelector('[data-field="to"]')?.focus();
  });

  document.querySelectorAll('[data-from-value]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.fromValue ?? '';
      const exactStopChoice = findExactStopMatch(value, state.pickerState.exactStopChoices);

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
      writeRouteUrl({ push: false });
      renderApp();
      bindInteractions();
    });
  });
}

function bindDepartureSelection() {
  document.querySelectorAll('[data-trip-key]').forEach((card) => {
    card.addEventListener('click', async (event) => {
      if (event.target.closest('a')) {
        return;
      }

      const tripKey = card.dataset.tripKey ?? '';
      const match = state.resultState?.type === 'results'
        ? state.resultState.allDepartures.find((departure) => departure.tripKey === tripKey)
        : null;

      if (!match || state.resultState?.type !== 'results') {
        return;
      }

      state.resultState = {
        ...state.resultState,
        selectedTripKey: tripKey,
        selectedTripMapLoadFailed: false,
      };

      renderApp();
      bindInteractions();

      const mapState = buildRouteMapState(match, state.stopCoordinates);
      if (mapState.hasMap) {
        const mapRendered = await renderSelectedTripMap(mapState);
        if (!mapRendered && state.resultState?.type === 'results' && state.resultState.selectedTripKey === tripKey) {
          state.resultState = {
            ...state.resultState,
            selectedTripMapLoadFailed: true,
          };
          renderApp();
          bindInteractions();
        }
      }
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

function bindLanguageSelector() {
  const languageSelect = document.querySelector('select[name="language"]');

  languageSelect?.addEventListener('change', (event) => {
    state.language = String(event.currentTarget.value ?? state.language);
    persistLanguage(window.localStorage, state.language);
    renderApp();
    bindInteractions();
  });
}

function bindTabNavigation() {
  document.querySelectorAll('[data-tab-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextTab = button.dataset.tabTarget ?? 'search';

      if (nextTab === state.activeTab) {
        return;
      }

      state.activeTab = nextTab;
      writeRouteUrl({ push: true });
      renderApp();
      bindInteractions();
    });
  });
}

function restoreSavedRoute(route) {
  state.activeTab = 'search';
  state.formValues = hydrateSearchStateFromRouteSnapshot({
    currentFormValues: state.formValues,
    route,
    stops: state.stops,
    localities: state.localities,
  });
  state.resultState = null;
  state.locationPicker = null;
  state.uiState = {
    fromPanelOpen: false,
    toPanelOpen: false,
  };
  state.pickerState = {
    exactStopChoices: [],
    reachableDestinations: [],
  };

  if (state.formValues.fromStopId) {
    state.pickerState = {
      ...state.pickerState,
      reachableDestinations: getReachableStops(state.formValues.fromStopId, state.reachability, state.stops),
    };
  } else if (state.formValues.fromLocalityId) {
    state.pickerState = {
      ...state.pickerState,
      exactStopChoices: getLocalityStops(state.formValues.fromLocalityId, state.localities, state.stops),
      reachableDestinations: getLocalityReachableStops(
        state.formValues.fromLocalityId,
        state.localities,
        state.reachability,
        state.stops,
      ),
    };
  }

  writeRouteUrl({ push: true });
  restoreSearchResultsIfReady();
  renderApp();
  bindInteractions();
}

function findSavedRoute(identity) {
  return [
    ...state.savedRoutes.favorites,
    ...state.savedRoutes.recents,
  ].find((route) => route.identity === identity) ?? null;
}

function bindSavedRoutes() {
  document.querySelector('[data-save-current-route]')?.addEventListener('click', () => {
    const resultCount = state.resultState?.type === 'results' ? state.resultState.allDepartures.length : 0;
    state.savedRoutes = addFavoriteRoute(savedRoutesStorage(), currentSavedRouteSnapshot({
      resultType: state.resultState?.type ?? null,
      resultCount,
    }));
    renderApp();
    bindInteractions();
  });

  document.querySelector('[data-share-current-route]')?.addEventListener('click', async () => {
    writeRouteUrl({ push: false });
    await navigator.clipboard?.writeText?.(window.location.href);
  });

  document.querySelectorAll('[data-saved-route], [data-recent-route]').forEach((button) => {
    button.addEventListener('click', () => {
      const identity = button.dataset.savedRoute ?? button.dataset.recentRoute ?? '';
      const route = findSavedRoute(identity);

      if (route) {
        restoreSavedRoute(route);
      }
    });
  });

  document.querySelectorAll('[data-remove-favorite]').forEach((button) => {
    button.addEventListener('click', () => {
      state.savedRoutes = removeFavoriteRoute(savedRoutesStorage(), button.dataset.removeFavorite ?? '');
      renderApp();
      bindInteractions();
    });
  });
}

function bindInteractions() {
  bindForm();
  bindFieldPanels();
  bindDepartureSelection();
  bindLocationActions();
  bindLanguageSelector();
  bindTabNavigation();
  bindSavedRoutes();
  bindNoDirectActions();
  bindBrowseActions();
}

async function boot() {
  try {
    const bootData = await loadAppBootstrapData({
      fetchJson: (url) => fetch(url).then((response) => response.json()),
      fetchJsonOrNull,
    });

    state.trips = bootData.trips;
    state.stops = bootData.stops;
    state.browseIndex = buildBrowseIndex({ trips: bootData.trips, stops: bootData.stops });
    state.stopCoordinates = bootData.stopCoordinates;
    state.localities = bootData.generatedLocalities ?? bootData.manualLocalities ?? [];
    state.reachability = bootData.generatedReachability ?? buildReachabilityFromTrips(bootData.trips);
    state.metadata = bootData.metadata;
    state.formValues = bootData.formValues;
    state.aliases = Object.fromEntries(bootData.stops.map((stop) => [stop.canonical, stop.variants]));
    state.savedRoutes = readSavedRoutes(savedRoutesStorage());

    hydrateRouteStateFromUrl();
    restoreSearchResultsIfReady();
    renderApp();
    bindInteractions();
    registerServiceWorker();
    window.addEventListener('popstate', () => {
      hydrateRouteStateFromUrl();
      restoreSearchResultsIfReady();
      renderApp();
      bindInteractions();
    });
  } catch (error) {
    const t = createTranslator(state.language);
    applySeoMetadata(document, buildDefaultSeoMetadata());
    app.innerHTML = renderShell(
      renderEmptyState(t, t('boot.dataUnavailable')),
      {
        language: state.language,
        languages: SUPPORTED_LANGUAGES,
        t,
      },
    );
    console.error(error);
  }
}

boot();

import {
  pushRouteSaveEvent,
  pushRouteSearchEvent,
  pushRouteShareEvent,
} from './lib/analytics.js';
import { loadAppBootstrapData } from './lib/appBootstrap.js';
import { buildBrowseIndex } from './lib/browseIndex.js';
import { buildFromSuggestionSections } from './lib/fromSuggestions.js';
import { findDirectTrips, resolveRouteStopIds } from './lib/query.js';
import {
  findExactLocalityMatch,
  findExactStopMatch,
  getDepartureStops,
  getLocalityReachableStops,
  getLocalityStops,
  getReachableStops,
  resolveOriginSelection,
} from './lib/localities.js';
import {
  buildNearbyStopChoices,
  createNearbyStopCacheKey,
  fetchOverpassNearbyStops,
} from './lib/nearbyStops.js';
import { buildRouteMapState } from './lib/routeMap.js';
import {
  openPanelWithPointerSafeTiming,
  shouldOpenPanelFromFocusedInputClick,
} from './lib/pickerTiming.js';
import { buildSearchOutcome } from './lib/searchOutcome.js';
import { findOneTransferSuggestions } from './lib/transferSuggestions.js';
import { ensureLeaflet } from './lib/leafletLoader.js';
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
import { buildRouteShareUrl } from './lib/shareRoute.js';
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
import { captureTextInputSelection, restoreTextInputSelection } from './lib/textInputSelection.js';
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
let locationPickerRequestId = 0;
const SHELL_AD_SLOTS = Object.freeze({
  lead: '',
  utility: '',
});

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
    query: '',
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
  routeActions: {
    saveFeedback: null,
    shareModal: null,
  },
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

function clearRouteResults() {
  state.resultState = null;
  state.routeActions = {
    saveFeedback: null,
    shareModal: null,
  };
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
  return currentOriginContext().selectedLocality?.stopIds ?? [];
}

function currentAvailableDepartureStops() {
  return getDepartureStops(state.stops, state.reachability);
}

function currentOriginContext() {
  return resolveOriginSelection({
    fromInput: state.formValues.fromInput,
    fromLocalityId: state.formValues.fromLocalityId,
    fromStopId: state.formValues.fromStopId,
    localities: state.localities,
    stops: state.stops,
    reachability: state.reachability,
  });
}

function currentResolvedRouteStopIds() {
  const originContext = currentOriginContext();
  return resolveRouteStopIds({
    from: state.formValues.fromInput,
    to: state.formValues.toInput,
    fromStopId: originContext.exactFromStop?.id ?? null,
    fromLocalityStopIds: originContext.exactFromStop ? [] : currentLocalityStopIds(),
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

function currentRouteAbsoluteUrl() {
  const params = serializeRouteUrlState(currentRouteUrlState());
  const query = params.toString();
  return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
}

function currentRouteActionContext() {
  return {
    from: state.formValues.fromInput,
    to: state.formValues.toInput,
    dayType: state.formValues.dayType,
    resultsCount: state.resultState?.type === 'results' ? state.resultState.allDepartures.length : 0,
  };
}

function focusShareModal() {
  document.querySelector('[data-share-modal-close]')?.focus();
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
  clearRouteResults();
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
  const originContext = currentOriginContext();
  const exactFromStop = originContext.exactFromStop;
  const selectedLocality = originContext.selectedLocality;
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
      query: state.browseState.query,
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
      fromLocalitySelected: Boolean(selectedLocality || exactFromStop),
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
      mapMessage: state.locationPicker.mapMessageKey ? t(state.locationPicker.mapMessageKey) : state.locationPicker.mapMessage,
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
        routeActions: state.routeActions,
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
    adSlots: SHELL_AD_SLOTS,
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
  clearRouteResults();
}

function currentFromSuggestions(t) {
  const originContext = currentOriginContext();
  const sections = buildFromSuggestionSections({
    inputValue: state.formValues.fromInput,
    localities: state.localities,
    selectedLocalityLabel: originContext.selectedLocality?.label ?? '',
    exactStopChoices: originContext.exactStopChoices,
    availableExactStops: currentAvailableDepartureStops(),
  });

  return {
    areas: sections.areas.map((entry) => ({ ...entry, meta: t('search.panel.area') })),
    exactStops: sections.exactStops.map((entry) => ({ ...entry, meta: t('search.panel.exactStop') })),
    exactStopHeading: sections.exactStopHeading,
  };
}

function currentDestinationMode() {
  const originContext = currentOriginContext();

  if (!originContext.selectedLocality && !originContext.exactFromStop) {
    return 'informational';
  }

  if (originContext.reachableDestinations.length === 0) {
    return 'empty';
  }

  return originContext.exactFromStop ? 'exact-stop-destinations' : 'locality-destinations';
}

function currentDestinationMessage(t) {
  const mode = currentDestinationMode();
  const originContext = currentOriginContext();

  if (mode === 'informational') {
    return t('search.destination.informational');
  }

  if (mode === 'empty') {
    return originContext.exactFromStop
      ? t('search.destination.emptyStop')
      : t('search.destination.emptyLocality');
  }

  return originContext.exactFromStop
    ? t('search.destination.fromStop')
    : t('search.destination.fromArea');
}

function currentDestinationOptions() {
  const originContext = currentOriginContext();
  const query = normalizeText(state.formValues.toInput);

  return originContext.reachableDestinations.filter(
    (stop) => !query || normalizeText(stop.canonical).includes(query),
  );
}

async function renderNearbyMap(requestId) {
  if (!state.locationPicker || state.locationPicker.state !== 'ready') {
    return false;
  }

  if (state.locationPicker.requestId !== requestId) {
    return false;
  }

  const mapElement = document.querySelector('#location-picker-map');

  if (!mapElement || !state.locationPicker.coords) {
    return false;
  }

  if (mapElement._leaflet_id) {
    return true;
  }

  try {
    const L = await ensureLeaflet();

    if (state.locationPicker?.requestId !== requestId || state.locationPicker.state !== 'ready') {
      return false;
    }

    if (!state.locationPicker.coords) {
      return false;
    }

    const { latitude, longitude } = state.locationPicker.coords;
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
      color: '#d93b4f',
      weight: 3,
      fillColor: '#eb4c60',
      fillOpacity: 0.35,
    }).addTo(map);

    for (const stop of state.locationPicker.nearbyStops) {
      L.marker([stop.latitude, stop.longitude]).addTo(map).bindPopup(stop.canonical);
    }

    return true;
  } catch (error) {
    console.error(error);
    return false;
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
  const requestId = locationPickerRequestId + 1;
  locationPickerRequestId = requestId;

  state.locationPicker = {
    requestId,
    fieldName,
    state: 'loading',
    nearbyStops: [],
    messageKey: '',
  };
  renderApp();
  bindInteractions();

  if (!navigator.geolocation) {
    state.locationPicker = {
      requestId,
      fieldName,
      state: 'error',
      messageKey: 'location.error.browser',
    };
    renderApp();
    bindInteractions();
    return;
  }

  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    if (state.locationPicker?.requestId !== requestId) {
      return;
    }

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

      if (state.locationPicker?.requestId !== requestId) {
        return;
      }

      writeNearbyStopCache(coords.latitude, coords.longitude, nearbyStops);

      state.locationPicker = nearbyStops.length
        ? {
          requestId,
          fieldName,
          state: 'ready',
          mapState: 'ready',
          nearbyStops,
          coords: {
            latitude: coords.latitude,
            longitude: coords.longitude,
          },
        }
        : {
          requestId,
          fieldName,
          state: 'error',
          nearbyStops: [],
          messageKey: 'location.error.nomatch',
        };
    } catch (error) {
      if (state.locationPicker?.requestId !== requestId) {
        return;
      }

      state.locationPicker = {
        requestId,
        fieldName,
        state: 'error',
        nearbyStops: [],
        messageKey: 'location.error.lookup',
      };
      console.error(error);
    }

    renderApp();
    bindInteractions();
    if (state.locationPicker?.requestId === requestId && state.locationPicker.state === 'ready') {
      const mapRendered = await renderNearbyMap(requestId);
      if (
        !mapRendered
        && state.locationPicker?.requestId === requestId
        && state.locationPicker.state === 'ready'
      ) {
        state.locationPicker = {
          ...state.locationPicker,
          mapState: 'unavailable',
          mapMessageKey: 'location.error.map',
        };
        renderApp();
        bindInteractions();
      }
      bindNearbyStopSelection();
    }
  }, () => {
    if (state.locationPicker?.requestId !== requestId) {
      return;
    }

    state.locationPicker = {
      requestId,
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
  state.routeActions = {
    saveFeedback: null,
    shareModal: null,
  };
  const routeStopIds = currentResolvedRouteStopIds();
  const originContext = currentOriginContext();
  const matches = findDirectTrips({
    from: state.formValues.fromInput,
    to: state.formValues.toInput,
    fromStopId: originContext.exactFromStop?.id ?? null,
    fromLocalityStopIds: originContext.exactFromStop
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
    fromLocalityId: originContext.selectedLocality?.id ?? null,
    fromStopId: originContext.exactFromStop?.id ?? null,
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
    clearRouteResults();
    state.uiState.fromPanelOpen = false;
    state.uiState.toPanelOpen = true;
  } else {
    state.formValues = {
      ...state.formValues,
      toInput: stop.canonical,
      toStopId: stop.id,
    };
    clearRouteResults();
  }

  writeRouteUrl({ push: true });
  restoreSearchResultsIfReady();
  renderApp();
  bindInteractions();
}

function bindBrowseActions() {
  document.querySelector('[data-browse-filter]')?.addEventListener('input', (event) => {
    const input = event.currentTarget;
    const selectionStart = input.selectionStart ?? input.value.length;
    const selectionEnd = input.selectionEnd ?? input.value.length;

    state.browseState = {
      ...state.browseState,
      query: input.value,
    };
    writeRouteUrl({ push: false });
    renderApp();
    bindInteractions();

    const nextInput = document.querySelector('[data-browse-filter]');
    nextInput?.focus();
    nextInput?.setSelectionRange?.(selectionStart, selectionEnd);
  });

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
  let toInputPointerOpening = false;

  function openFromPanel({ selectText = false } = {}) {
    if (state.uiState.fromPanelOpen) {
      return;
    }

    state.uiState.fromPanelOpen = true;
    state.uiState.toPanelOpen = false;
    renderApp();
    bindInteractions();
    focusFromInput(selectText);
  }

  fromInput?.addEventListener('focus', () => {
    openFromPanel();
  });

  fromInput?.addEventListener('pointerdown', () => {
    openPanelWithPointerSafeTiming({
      openedByPointer: true,
      open: () => openFromPanel(),
      schedule: (callback) => window.setTimeout(callback, 0),
    });
  });

  fromInput?.addEventListener('click', (event) => {
    if (shouldOpenPanelFromFocusedInputClick({
      inputIsFocused: document.activeElement === event.currentTarget,
      panelIsOpen: state.uiState.fromPanelOpen,
    })) {
      openFromPanel();
    }
  });

  fromInput?.addEventListener('input', (event) => {
    const nextValue = String(event.currentTarget.value ?? '');
    const selection = captureTextInputSelection(event.currentTarget);
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
    clearRouteResults();
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
    restoreTextInputSelection(document.querySelector('[data-field="from"]'), selection);
  });

  function openToPanel() {
    if (state.uiState.toPanelOpen) {
      return;
    }

    state.uiState.fromPanelOpen = false;
    state.uiState.toPanelOpen = true;
    renderApp();
    bindInteractions();
    document.querySelector('[data-field="to"]')?.focus();
  }

  toInput?.addEventListener('pointerdown', () => {
    toInputPointerOpening = true;
  });

  toInput?.addEventListener('focus', () => {
    openPanelWithPointerSafeTiming({
      openedByPointer: toInputPointerOpening,
      open: () => {
        toInputPointerOpening = false;
        openToPanel();
      },
      schedule: (callback) => window.setTimeout(callback, 0),
    });
  });

  toInput?.addEventListener('click', (event) => {
    if (shouldOpenPanelFromFocusedInputClick({
      inputIsFocused: document.activeElement === event.currentTarget,
      panelIsOpen: state.uiState.toPanelOpen,
    })) {
      openToPanel();
    }
  });

  toInput?.addEventListener('input', (event) => {
    const selection = captureTextInputSelection(event.currentTarget);
    state.formValues = {
      ...state.formValues,
      toInput: String(event.currentTarget.value ?? ''),
      toStopId: null,
    };
    clearRouteResults();
    state.uiState.toPanelOpen = true;
    writeRouteUrl({ push: false });
    renderApp();
    bindInteractions();
    restoreTextInputSelection(document.querySelector('[data-field="to"]'), selection);
  });

  document.querySelectorAll('[data-from-value]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.fromValue ?? '';
      const optionType = button.dataset.optionType ?? '';
      const exactStopChoice = optionType === 'exact-stop'
        ? findExactStopMatch(value, currentAvailableDepartureStops())
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
      clearRouteResults();
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
  clearRouteResults();
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
    state.savedRoutes = addFavoriteRoute(savedRoutesStorage(), currentSavedRouteSnapshot({
      resultType: state.resultState?.type ?? null,
      resultCount: currentRouteActionContext().resultsCount,
    }));

    const saveStatus = state.savedRoutes.available ? 'saved' : 'unavailable';
    state.routeActions = {
      saveFeedback: { status: saveStatus },
      shareModal: null,
    };
    pushRouteSaveEvent(window, {
      ...currentRouteActionContext(),
      saveStatus,
    });
    renderApp();
    bindInteractions();
  });

  document.querySelector('[data-share-current-route]')?.addEventListener('click', () => {
    writeRouteUrl({ push: false });
    state.routeActions = {
      ...state.routeActions,
      shareModal: {
        baseUrl: currentRouteAbsoluteUrl(),
        status: null,
      },
    };
    renderApp();
    bindInteractions();
    focusShareModal();
  });

  document.querySelector('[data-share-copy-link]')?.addEventListener('click', async (event) => {
    const shareUrl = event.currentTarget.dataset.shareUrl ?? buildRouteShareUrl(currentRouteAbsoluteUrl(), 'link');
    let status = 'copied';

    try {
      await navigator.clipboard?.writeText?.(shareUrl);
    } catch {
      status = 'manualCopy';
    }

    if (!navigator.clipboard?.writeText) {
      status = 'manualCopy';
    }

    pushRouteShareEvent(window, {
      ...currentRouteActionContext(),
      shareMethod: 'link',
      shareUrl,
    });

    state.routeActions = {
      ...state.routeActions,
      shareModal: {
        ...(state.routeActions.shareModal ?? {}),
        status,
      },
    };
    renderApp();
    bindInteractions();
    focusShareModal();
  });

  document.querySelectorAll('[data-share-option]').forEach((link) => {
    link.addEventListener('click', () => {
      pushRouteShareEvent(window, {
        ...currentRouteActionContext(),
        shareMethod: link.dataset.shareOption ?? '',
        shareUrl: link.dataset.shareUrl ?? '',
      });
    });
  });

  document.querySelector('[data-share-modal-backdrop]')?.addEventListener('click', (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    state.routeActions = {
      ...state.routeActions,
      shareModal: null,
    };
    renderApp();
    bindInteractions();
    document.querySelector('[data-share-current-route]')?.focus();
  });

  document.querySelector('[data-share-modal-close]')?.addEventListener('click', () => {
    state.routeActions = {
      ...state.routeActions,
      shareModal: null,
    };
    renderApp();
    bindInteractions();
    document.querySelector('[data-share-current-route]')?.focus();
  });

  document.querySelector('[data-share-modal]')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    state.routeActions = {
      ...state.routeActions,
      shareModal: null,
    };
    renderApp();
    bindInteractions();
    document.querySelector('[data-share-current-route]')?.focus();
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
        adSlots: SHELL_AD_SLOTS,
        t,
      },
    );
    console.error(error);
  }
}

boot();

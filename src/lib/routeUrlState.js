const VALID_TABS = new Set(['search', 'browse', 'saved']);
const VALID_BROWSE_MODES = new Set(['lines', 'stops']);
const VALID_DAY_TYPES = new Set(['feriale', 'sabato', 'festivo', 'scolastico']);

export const DEFAULT_ROUTE_URL_STATE = {
  tab: 'search',
  search: {
    fromInput: '',
    fromLocalityId: null,
    fromStopId: null,
    toInput: '',
    toStopId: null,
    dayType: 'feriale',
  },
  browse: {
    mode: 'lines',
    lineId: null,
    stopId: null,
    query: '',
  },
};

function cloneDefaultState() {
  if (typeof structuredClone === 'function') {
    return structuredClone(DEFAULT_ROUTE_URL_STATE);
  }

  return JSON.parse(JSON.stringify(DEFAULT_ROUTE_URL_STATE));
}

function valueOrNull(value) {
  return value || null;
}

function hasValidDayParam(search = '') {
  return VALID_DAY_TYPES.has(new URLSearchParams(search).get('day'));
}

function validateSearchStateIds(searchState, { stops = [], localities = [] } = {}) {
  const stopIds = new Set(stops.map((stop) => stop.id));
  const localityIds = new Set(localities.map((locality) => locality.id));
  const hydrated = { ...searchState };

  if (hydrated.fromLocalityId && !localityIds.has(hydrated.fromLocalityId)) {
    hydrated.fromLocalityId = null;
  }

  if (hydrated.fromStopId && !stopIds.has(hydrated.fromStopId)) {
    hydrated.fromStopId = null;
  }

  if (hydrated.toStopId && !stopIds.has(hydrated.toStopId)) {
    hydrated.toStopId = null;
  }

  return hydrated;
}

export function parseRouteUrlState(search = '') {
  const params = new URLSearchParams(search);
  const tab = params.get('tab') ?? DEFAULT_ROUTE_URL_STATE.tab;
  const mode = params.get('browse') ?? DEFAULT_ROUTE_URL_STATE.browse.mode;
  const dayType = params.get('day') ?? DEFAULT_ROUTE_URL_STATE.search.dayType;

  if (!VALID_TABS.has(tab) || !VALID_BROWSE_MODES.has(mode) || !VALID_DAY_TYPES.has(dayType)) {
    return cloneDefaultState();
  }

  const fromStopId = valueOrNull(params.get('fromStop'));

  return {
    tab,
    search: {
      fromInput: params.get('from') ?? '',
      fromLocalityId: valueOrNull(params.get('fromLocality')),
      fromStopId,
      toInput: params.get('to') ?? '',
      toStopId: valueOrNull(params.get('toStop')),
      dayType,
    },
    browse: {
      mode,
      lineId: valueOrNull(params.get('line')),
      stopId: valueOrNull(params.get('stop')),
      query: params.get('browseQuery') ?? '',
    },
  };
}

export function serializeRouteUrlState(routeState = DEFAULT_ROUTE_URL_STATE) {
  const state = {
    ...DEFAULT_ROUTE_URL_STATE,
    ...routeState,
    search: {
      ...DEFAULT_ROUTE_URL_STATE.search,
      ...routeState.search,
    },
    browse: {
      ...DEFAULT_ROUTE_URL_STATE.browse,
      ...routeState.browse,
    },
  };
  const params = new URLSearchParams();

  params.set('tab', VALID_TABS.has(state.tab) ? state.tab : DEFAULT_ROUTE_URL_STATE.tab);

  if (state.search.fromInput) {
    params.set('from', state.search.fromInput);
  }

  if (state.search.fromLocalityId) {
    params.set('fromLocality', state.search.fromLocalityId);
  }

  if (state.search.fromStopId) {
    params.set('fromStop', state.search.fromStopId);
  }

  if (state.search.toInput) {
    params.set('to', state.search.toInput);
  }

  if (state.search.toStopId) {
    params.set('toStop', state.search.toStopId);
  }

  params.set('day', VALID_DAY_TYPES.has(state.search.dayType)
    ? state.search.dayType
    : DEFAULT_ROUTE_URL_STATE.search.dayType);
  params.set('browse', VALID_BROWSE_MODES.has(state.browse.mode)
    ? state.browse.mode
    : DEFAULT_ROUTE_URL_STATE.browse.mode);

  if (state.browse.lineId) {
    params.set('line', state.browse.lineId);
  }

  if (state.browse.stopId) {
    params.set('stop', state.browse.stopId);
  }

  if (state.browse.query?.trim()) {
    params.set('browseQuery', state.browse.query.trim());
  }

  return params;
}

export function hydrateSearchStateFromUrl({
  currentFormValues = DEFAULT_ROUTE_URL_STATE.search,
  urlSearchState = DEFAULT_ROUTE_URL_STATE.search,
  search = '',
  stops = [],
  localities = [],
} = {}) {
  let hydrated = {
    ...DEFAULT_ROUTE_URL_STATE.search,
    ...currentFormValues,
    ...urlSearchState,
  };

  if (!hasValidDayParam(search)) {
    hydrated.dayType = currentFormValues.dayType ?? DEFAULT_ROUTE_URL_STATE.search.dayType;
  }

  hydrated = validateSearchStateIds(hydrated, { stops, localities });

  return hydrated;
}

export function hydrateSearchStateFromRouteSnapshot({
  currentFormValues = DEFAULT_ROUTE_URL_STATE.search,
  route = DEFAULT_ROUTE_URL_STATE.search,
  stops = [],
  localities = [],
} = {}) {
  const hydrated = {
    ...DEFAULT_ROUTE_URL_STATE.search,
    ...currentFormValues,
    fromInput: route.fromInput ?? '',
    fromLocalityId: route.fromLocalityId ?? null,
    fromStopId: route.fromStopId ?? null,
    toInput: route.toInput ?? '',
    toStopId: route.toStopId ?? null,
    dayType: VALID_DAY_TYPES.has(route.dayType) ? route.dayType : DEFAULT_ROUTE_URL_STATE.search.dayType,
  };

  return validateSearchStateIds(hydrated, { stops, localities });
}

export function shouldRunSearchFromRouteState(routeState = DEFAULT_ROUTE_URL_STATE) {
  const state = {
    ...DEFAULT_ROUTE_URL_STATE,
    ...routeState,
    search: {
      ...DEFAULT_ROUTE_URL_STATE.search,
      ...routeState.search,
    },
  };

  return state.tab === 'search'
    && Boolean(state.search.fromInput.trim())
    && Boolean(state.search.toInput.trim());
}

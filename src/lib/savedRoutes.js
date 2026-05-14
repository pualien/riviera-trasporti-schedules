export const SAVED_ROUTES_STORAGE_KEY = 'riviera:saved-routes';
export const SAVED_ROUTE_LIMIT = 8;

function defaultStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function emptySavedRoutes(available = true) {
  return { favorites: [], recents: [], available };
}

function normalizeRoute(route) {
  return {
    ...route,
    identity: createRouteIdentity(route),
  };
}

function writeSavedRoutes(storage, savedRoutes) {
  try {
    storage?.setItem?.(SAVED_ROUTES_STORAGE_KEY, JSON.stringify({
      favorites: savedRoutes.favorites,
      recents: savedRoutes.recents,
    }));
    return { ...savedRoutes, available: true };
  } catch {
    return { favorites: [], recents: [], available: false };
  }
}

function addRouteToList(list, route) {
  const normalizedRoute = normalizeRoute(route);
  return [
    normalizedRoute,
    ...list.filter((entry) => entry.identity !== normalizedRoute.identity),
  ].slice(0, SAVED_ROUTE_LIMIT);
}

export function createRouteIdentity(route) {
  return [
    route.fromLocalityId || route.fromInput || '',
    route.fromStopId || '',
    route.toInput || '',
    route.toStopId || '',
    route.dayType || '',
  ].join('|');
}

export function readSavedRoutes(storage = defaultStorage()) {
  try {
    const rawValue = storage?.getItem?.(SAVED_ROUTES_STORAGE_KEY);

    if (!rawValue) {
      return emptySavedRoutes(true);
    }

    const parsed = JSON.parse(rawValue);
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      recents: Array.isArray(parsed.recents) ? parsed.recents : [],
      available: true,
    };
  } catch {
    return emptySavedRoutes(false);
  }
}

export function addRecentRoute(storage = defaultStorage(), route) {
  const savedRoutes = readSavedRoutes(storage);

  if (!savedRoutes.available) {
    return savedRoutes;
  }

  return writeSavedRoutes(storage, {
    ...savedRoutes,
    recents: addRouteToList(savedRoutes.recents, route),
  });
}

export function addFavoriteRoute(storage = defaultStorage(), route) {
  const savedRoutes = readSavedRoutes(storage);

  if (!savedRoutes.available) {
    return savedRoutes;
  }

  return writeSavedRoutes(storage, {
    ...savedRoutes,
    favorites: addRouteToList(savedRoutes.favorites, route),
  });
}

export function removeFavoriteRoute(storage = defaultStorage(), identity) {
  const savedRoutes = readSavedRoutes(storage);

  if (!savedRoutes.available) {
    return savedRoutes;
  }

  return writeSavedRoutes(storage, {
    ...savedRoutes,
    favorites: savedRoutes.favorites.filter((route) => route.identity !== identity),
  });
}

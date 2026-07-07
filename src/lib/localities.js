import { normalizeText } from './normalize.js';

function localityTokens(locality) {
  return [locality.label, ...(locality.aliases ?? []), ...(locality.matchTokens ?? [])]
    .map(normalizeText);
}

function stopTokens(stop) {
  return [stop.canonical, ...(stop.variants ?? []), ...(stop.matchTokens ?? [])]
    .map(normalizeText);
}

export function localityForStopId(stopId, localities = []) {
  return localities.find((locality) => (locality.stopIds ?? []).includes(stopId)) ?? null;
}

export function stopDisplayLabel(stop, localities = []) {
  const locality = localityForStopId(stop?.id, localities);

  return locality ? `${stop.canonical} (${locality.label})` : stop?.canonical;
}

export function withStopDisplayLabels(stops = [], localities = []) {
  return stops.map((stop) => ({
    ...stop,
    displayLabel: stopDisplayLabel(stop, localities),
  }));
}

export function findMatchingLocalities(query, localities) {
  const normalizedQuery = normalizeText(query);

  return localities.filter((locality) =>
    localityTokens(locality).some((token) => token.includes(normalizedQuery)),
  );
}

export function findExactLocalityMatch(query, localities) {
  const normalizedQuery = normalizeText(query);

  return localities.find((locality) =>
    localityTokens(locality).some((token) => token === normalizedQuery),
  ) ?? null;
}

export function findExactStopMatch(query, stops) {
  const normalizedQuery = normalizeText(query);

  return stops.find((stop) =>
    stopTokens(stop).some((token) => token === normalizedQuery),
  ) ?? null;
}

export function getLocalityStops(localityId, localities, stops) {
  const locality = localities.find((entry) => entry.id === localityId);

  if (!locality) {
    return [];
  }

  const stopMap = new Map(stops.map((stop) => [stop.id, stop]));
  return locality.stopIds.map((stopId) => stopMap.get(stopId)).filter(Boolean);
}

export function getReachableStops(fromStopId, reachability, stops) {
  const stopMap = new Map(stops.map((stop) => [stop.id, stop]));
  return (reachability[fromStopId] ?? []).map((stopId) => stopMap.get(stopId)).filter(Boolean);
}

export function getDepartureStops(stops, reachability) {
  return [...new Map(
    stops
      .filter((stop) => (reachability[stop.id] ?? []).length > 0)
      .map((stop) => [stop.id, stop]),
  ).values()];
}

export function getLocalityReachableStops(localityId, localities, reachability, stops) {
  const stopMap = new Map(stops.map((stop) => [stop.id, stop]));
  const localityStops = getLocalityStops(localityId, localities, stops);
  const destinationIds = new Set();

  for (const stop of localityStops) {
    for (const destinationId of reachability[stop.id] ?? []) {
      destinationIds.add(destinationId);
    }
  }

  return [...destinationIds]
    .sort()
    .map((stopId) => stopMap.get(stopId))
    .filter(Boolean);
}

export function resolveOriginSelection({
  fromInput = '',
  fromLocalityId = null,
  fromStopId = null,
  localities = [],
  stops = [],
  reachability = {},
} = {}) {
  const explicitLocality = fromLocalityId
    ? localities.find((locality) => locality.id === fromLocalityId) ?? null
    : null;
  const explicitStop = fromStopId
    ? stops.find((stop) => stop.id === fromStopId) ?? null
    : null;

  if (explicitStop) {
    const selectedLocality = localityForStopId(explicitStop.id, localities);
    return {
      selectedLocality,
      exactFromStop: explicitStop,
      exactStopChoices: selectedLocality
        ? getLocalityStops(selectedLocality.id, localities, stops)
        : [],
      reachableDestinations: getReachableStops(explicitStop.id, reachability, stops),
    };
  }

  if (explicitLocality) {
    return {
      selectedLocality: explicitLocality,
      exactFromStop: null,
      exactStopChoices: getLocalityStops(explicitLocality.id, localities, stops),
      reachableDestinations: getLocalityReachableStops(explicitLocality.id, localities, reachability, stops),
    };
  }

  const typedStop = fromInput ? findExactStopMatch(fromInput, getDepartureStops(stops, reachability)) : null;
  if (typedStop) {
    const selectedLocality = localityForStopId(typedStop.id, localities);
    return {
      selectedLocality,
      exactFromStop: typedStop,
      exactStopChoices: selectedLocality
        ? getLocalityStops(selectedLocality.id, localities, stops)
        : [],
      reachableDestinations: getReachableStops(typedStop.id, reachability, stops),
    };
  }

  const typedLocality = fromInput ? findExactLocalityMatch(fromInput, localities) : null;
  if (typedLocality) {
    return {
      selectedLocality: typedLocality,
      exactFromStop: null,
      exactStopChoices: getLocalityStops(typedLocality.id, localities, stops),
      reachableDestinations: getLocalityReachableStops(typedLocality.id, localities, reachability, stops),
    };
  }

  return {
    selectedLocality: null,
    exactFromStop: null,
    exactStopChoices: [],
    reachableDestinations: [],
  };
}

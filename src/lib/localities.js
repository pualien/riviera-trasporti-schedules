import { normalizeText } from './normalize.js';

function localityTokens(locality) {
  return [locality.label, ...(locality.aliases ?? []), ...(locality.matchTokens ?? [])]
    .map(normalizeText);
}

function stopTokens(stop) {
  return [stop.canonical, ...(stop.variants ?? []), ...(stop.matchTokens ?? [])]
    .map(normalizeText);
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

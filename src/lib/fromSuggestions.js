import { normalizeText } from './normalize.js';

function sortByLabel(entries) {
  return [...entries].sort((left, right) =>
    normalizeText(left.label ?? left.canonical).localeCompare(normalizeText(right.label ?? right.canonical)),
  );
}

function localityMatches(locality, query) {
  const tokens = [
    locality.label,
    ...(locality.aliases ?? []),
    ...(locality.matchTokens ?? []),
  ].map(normalizeText);

  return !query || tokens.some((token) => token.includes(query));
}

function stopMatches(stop, query) {
  const tokens = [
    stop.canonical,
    ...(stop.variants ?? []),
    ...(stop.matchTokens ?? []),
  ].map(normalizeText);

  return !query || tokens.some((token) => token.includes(query));
}

const EXACT_STOP_FALLBACK_COVERAGE_RATIO = 0.6;

function localityCoverageNeedsExactStopFallback(localities = [], availableExactStops = []) {
  if (availableExactStops.length === 0) {
    return false;
  }

  if (localities.length === 0) {
    return true;
  }

  const coveredStopIds = new Set(
    localities.flatMap((locality) => locality.stopIds ?? []),
  );
  const coveredExactStopCount = availableExactStops.filter((stop) => coveredStopIds.has(stop.id)).length;

  return (coveredExactStopCount / availableExactStops.length) < EXACT_STOP_FALLBACK_COVERAGE_RATIO;
}

export function buildFromSuggestionSections({
  inputValue,
  localities,
  selectedLocalityLabel,
  exactStopChoices,
  availableExactStops = [],
}) {
  const query = normalizeText(inputValue);
  const matchingAreas = sortByLabel(localities)
    .filter((locality) => localityMatches(locality, query))
    .map((locality) => ({ value: locality.label, meta: 'Area', type: 'area' }));
  const shouldExposeNetworkStops = !query && localityCoverageNeedsExactStopFallback(localities, availableExactStops);
  const exactStopSource = exactStopChoices.length
    ? exactStopChoices
    : ((query || shouldExposeNetworkStops) ? availableExactStops : []);
  const matchingExactStops = sortByLabel(exactStopSource)
    .filter((stop) => stopMatches(stop, query))
    .map((stop) => ({ value: stop.canonical, meta: 'Exact stop', type: 'exact-stop' }));

  return {
    areas: matchingAreas,
    exactStops: matchingExactStops,
    exactStopHeading: selectedLocalityLabel,
  };
}

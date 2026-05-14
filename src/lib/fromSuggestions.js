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
  const exactStopSource = exactStopChoices.length
    ? exactStopChoices
    : (query ? availableExactStops : []);
  const matchingExactStops = sortByLabel(exactStopSource)
    .filter((stop) => stopMatches(stop, query))
    .map((stop) => ({ value: stop.canonical, meta: 'Exact stop', type: 'exact-stop' }));

  return {
    areas: matchingAreas,
    exactStops: matchingExactStops,
    exactStopHeading: selectedLocalityLabel,
  };
}

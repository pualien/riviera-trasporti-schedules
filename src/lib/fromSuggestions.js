import { normalizeText } from './normalize.js';
import { localityForStopId, stopDisplayLabel } from './localities.js';

function sortByLabel(entries) {
  return [...entries].sort((left, right) =>
    normalizeText(left.label ?? left.canonical).localeCompare(normalizeText(right.label ?? right.canonical)),
  );
}

function directStopMatches(stop, query) {
  const tokens = [
    stop.canonical,
    ...(stop.variants ?? []),
    ...(stop.matchTokens ?? []),
  ].filter(Boolean).map(normalizeText);

  return !query || tokens.some((token) => token.includes(query));
}

function localityStopMatches(stop, query, localities = []) {
  const locality = localityForStopId(stop.id, localities);
  const tokens = [
    locality?.label,
    ...(locality?.aliases ?? []),
    ...(locality?.matchTokens ?? []),
  ].filter(Boolean).map(normalizeText);

  return !query || tokens.some((token) => token.includes(query));
}

function matchingStops(stops, query, localities) {
  if (!query) {
    return stops;
  }

  const directMatches = stops.filter((stop) => directStopMatches(stop, query));
  if (directMatches.length) {
    return directMatches;
  }

  return stops.filter((stop) => localityStopMatches(stop, query, localities));
}

export function buildFromSuggestionSections({
  inputValue,
  localities,
  selectedLocalityLabel,
  exactStopChoices,
  availableExactStops = [],
}) {
  const query = normalizeText(inputValue);
  const exactStopSource = exactStopChoices.length
    ? exactStopChoices
    : availableExactStops;
  const matchingExactStops = matchingStops(sortByLabel(exactStopSource), query, localities)
    .map((stop) => ({
      value: stop.canonical,
      label: stopDisplayLabel(stop, localities),
      meta: 'Stop',
      type: 'exact-stop',
    }));

  return {
    areas: [],
    exactStops: matchingExactStops,
    exactStopHeading: selectedLocalityLabel,
  };
}

import { normalizeText } from './normalize.js';
import { localityForStopId, stopDisplayLabel } from './localities.js';

function sortByLabel(entries) {
  return [...entries].sort((left, right) =>
    normalizeText(left.label ?? left.canonical).localeCompare(normalizeText(right.label ?? right.canonical)),
  );
}

function stopMatches(stop, query, localities = []) {
  const locality = localityForStopId(stop.id, localities);
  const tokens = [
    stop.canonical,
    ...(stop.variants ?? []),
    ...(stop.matchTokens ?? []),
    locality?.label,
    ...(locality?.aliases ?? []),
    ...(locality?.matchTokens ?? []),
  ].filter(Boolean).map(normalizeText);

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
  const exactStopSource = exactStopChoices.length
    ? exactStopChoices
    : availableExactStops;
  const matchingExactStops = sortByLabel(exactStopSource)
    .filter((stop) => stopMatches(stop, query, localities))
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

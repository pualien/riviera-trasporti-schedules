import { normalizeText } from './normalize.js';

function sortByLabel(entries) {
  return [...entries].sort((left, right) =>
    normalizeText(left.label ?? left.canonical).localeCompare(normalizeText(right.label ?? right.canonical)),
  );
}

export function buildFromSuggestionSections({
  inputValue,
  localities,
  selectedLocalityLabel,
  exactStopChoices,
}) {
  const query = normalizeText(inputValue);
  const matchingAreas = sortByLabel(localities)
    .filter((locality) => !query || normalizeText(locality.label).includes(query))
    .map((locality) => ({ value: locality.label, meta: 'Area' }));
  const matchingExactStops = sortByLabel(exactStopChoices)
    .filter((stop) => !query || normalizeText(stop.canonical).includes(query))
    .map((stop) => ({ value: stop.canonical, meta: 'Exact stop' }));

  return {
    areas: matchingAreas,
    exactStops: matchingExactStops,
    exactStopHeading: selectedLocalityLabel,
  };
}

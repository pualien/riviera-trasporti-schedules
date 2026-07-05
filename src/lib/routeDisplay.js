import { normalizeText } from './normalize.js';

const LOWERCASE_WORDS = new Set(['a', 'al', 'alla', 'alle', 'da', 'dal', 'del', 'della', 'dei', 'di', 'e', 'il', 'la', 'le', 'lo']);

function titleToken(token = '', index = 0) {
  const normalized = token.toLowerCase();

  if (index > 0 && LOWERCASE_WORDS.has(normalized)) {
    return normalized;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function titleCase(value = '') {
  return String(value)
    .trim()
    .split(/(\s+|[-/()"])/)
    .map((part, index) => (/^[A-Za-z]+$/.test(part) ? titleToken(part, index) : part))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function findStop(stopId, stops = []) {
  return stops.find((stop) => stop.id === stopId) ?? null;
}

function findLocality({ localityId = null, stopId = null, localities = [] }) {
  if (localityId) {
    const byId = localities.find((locality) => locality.id === localityId);
    if (byId) {
      return byId;
    }
  }

  if (!stopId) {
    return null;
  }

  return localities.find((locality) => locality.stopIds?.includes(stopId)) ?? null;
}

function stopLabelWithLocality(stop, locality) {
  const canonical = stop?.canonical ?? '';

  if (!locality) {
    return titleCase(canonical);
  }

  const normalizedCanonical = normalizeText(canonical);
  const normalizedLocality = normalizeText(locality.label);

  if (normalizedCanonical === normalizedLocality) {
    return locality.label;
  }

  if (!normalizedCanonical.startsWith(`${normalizedLocality} `)) {
    return titleCase(canonical);
  }

  const detail = canonical.slice(locality.label.length).replace(/^[-\s]+/, '');
  return detail ? `${locality.label}, ${titleCase(detail)}` : locality.label;
}

export function formatRouteEndpoint({
  input = '',
  localityId = null,
  stopId = null,
  localities = [],
  stops = [],
} = {}) {
  const locality = findLocality({ localityId, stopId, localities });

  if (stopId) {
    const stop = findStop(stopId, stops);
    if (stop) {
      return stopLabelWithLocality(stop, locality);
    }
  }

  if (locality) {
    return locality.label;
  }

  return titleCase(input);
}

export function formatRouteLabel({
  fromInput = '',
  fromLocalityId = null,
  fromStopId = null,
  toInput = '',
  toStopId = null,
  localities = [],
  stops = [],
  separator = 'to',
} = {}) {
  const fromLabel = formatRouteEndpoint({
    input: fromInput,
    localityId: fromLocalityId,
    stopId: fromStopId,
    localities,
    stops,
  });
  const toLabel = formatRouteEndpoint({
    input: toInput,
    stopId: toStopId,
    localities,
    stops,
  });

  return `${fromLabel} ${separator} ${toLabel}`;
}

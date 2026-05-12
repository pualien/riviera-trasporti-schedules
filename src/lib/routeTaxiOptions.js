import { findExactStopMatch } from './localities.js';
import { resolveProvinceForStop } from './provinceLookup.js';
import { findTaxiOptionByProvince } from './taxiDirectory.js';

function resolveSelectedStop({ stopId, inputValue, stops }) {
  if (stopId) {
    return stops.find((stop) => stop.id === stopId) ?? null;
  }

  if (!inputValue) {
    return null;
  }

  return findExactStopMatch(inputValue, stops);
}

export function findTaxiOptionsForRoute({
  fromInput = '',
  fromStopId = null,
  toInput = '',
  toStopId = null,
  stops = [],
}) {
  const endpointStops = [
    resolveSelectedStop({ stopId: fromStopId, inputValue: fromInput, stops }),
    resolveSelectedStop({ stopId: toStopId, inputValue: toInput, stops }),
  ].filter(Boolean);

  const provinceIds = [...new Set(endpointStops
    .map((stop) => resolveProvinceForStop(stop.id, stops))
    .filter(Boolean))];

  return provinceIds
    .map((provinceId) => findTaxiOptionByProvince(provinceId))
    .filter(Boolean);
}

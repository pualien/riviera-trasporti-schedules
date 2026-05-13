import { findExactStopMatch } from './localities.js';
import { resolveProvinceForStop } from './provinceLookup.js';
import { findTaxiOptionByProvince, findTaxiOptionByStop } from './taxiDirectory.js';

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

  return dedupeTaxiOptions(endpointStops
    .map((stop) =>
      findTaxiOptionByStop(stop)
      ?? findTaxiOptionByProvince(resolveProvinceForStop(stop.id, stops)))
    .filter(Boolean));
}

export function dedupeTaxiOptions(taxiOptions = []) {
  return [...new Map(taxiOptions.map((entry) => [entry.serviceId, entry])).values()];
}

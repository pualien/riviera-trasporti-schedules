import { canonicalizeStopName, stopIdFromName } from './normalize.js';
import { durationBetween, toMinutes } from './time.js';

function stopIdForSearchInput(value, aliases) {
  const stopId = stopIdFromName(canonicalizeStopName(value, aliases));
  return stopId || null;
}

function tripStopId(stop) {
  return stop.stopId ?? stopIdFromName(stop.name);
}

function findForwardStopSegment(stops, originStopId, destinationStopId) {
  for (let fromIndex = 0; fromIndex < stops.length; fromIndex += 1) {
    if (tripStopId(stops[fromIndex]) !== originStopId) {
      continue;
    }

    const toIndex = stops.findIndex((stop, index) => (
      index > fromIndex && tripStopId(stop) === destinationStopId
    ));

    if (toIndex !== -1) {
      return { fromIndex, toIndex };
    }
  }

  return null;
}

export function resolveRouteStopIds({
  from = '',
  to = '',
  fromStopId = null,
  fromLocalityStopIds = [],
  toStopId = null,
  aliases = {},
} = {}) {
  const originStopIds = fromStopId
    ? [fromStopId]
    : fromLocalityStopIds.length
      ? fromLocalityStopIds
      : [stopIdForSearchInput(from, aliases)].filter(Boolean);

  return {
    originStopIds,
    destinationStopId: toStopId ?? stopIdForSearchInput(to, aliases),
  };
}

export function findDirectTrips({ from, to, fromStopId, fromLocalityStopIds = [], toStopId, dayType, aliases, trips }) {
  const {
    originStopIds: resolvedOriginStopIds,
    destinationStopId: resolvedToStopId,
  } = resolveRouteStopIds({
    from,
    to,
    fromStopId,
    fromLocalityStopIds,
    toStopId,
    aliases,
  });

  if (!resolvedOriginStopIds.length || !resolvedToStopId) {
    return [];
  }

  return trips
    .filter((trip) => trip.dayType === dayType)
    .flatMap((trip, tripIndex) =>
      resolvedOriginStopIds.map((originStopId) => {
        const segment = findForwardStopSegment(trip.stops, originStopId, resolvedToStopId);

        if (!segment) {
          return null;
        }

        const { fromIndex, toIndex } = segment;
        const fromStop = trip.stops[fromIndex];
        const toStop = trip.stops[toIndex];

        return {
          tripKey: `${trip.lineId}:${trip.dayType}:${trip.sourcePage}:${tripIndex}:${originStopId}:${resolvedToStopId}`,
          lineId: trip.lineId,
          direction: trip.direction,
          sourcePage: trip.sourcePage,
          fromStopId: originStopId,
          toStopId: resolvedToStopId,
          fromIndex,
          toIndex,
          departureTime: fromStop.time,
          arrivalTime: toStop.time,
          durationMinutes: durationBetween(fromStop.time, toStop.time),
          segmentStops: trip.stops.slice(fromIndex, toIndex + 1),
        };
      }),
    )
    .filter(Boolean)
    .sort((left, right) => toMinutes(left.departureTime) - toMinutes(right.departureTime));
}

export function buildRouteSummary(matches) {
  const totalDuration = matches.reduce((sum, match) => sum + match.durationMinutes, 0);

  return {
    averageDurationMinutes: Math.round(totalDuration / matches.length),
    firstDeparture: matches[0]?.departureTime ?? null,
    lastDeparture: matches.at(-1)?.departureTime ?? null,
    lines: [...new Set(matches.map((match) => match.lineId))],
  };
}

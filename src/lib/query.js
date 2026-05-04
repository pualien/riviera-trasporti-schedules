import { canonicalizeStopName, stopIdFromName } from './normalize.js';
import { durationBetween, toMinutes } from './time.js';

export function findDirectTrips({ from, to, fromStopId, fromLocalityStopIds = [], toStopId, dayType, aliases, trips }) {
  const resolvedOriginStopIds = fromStopId
    ? [fromStopId]
    : fromLocalityStopIds.length
      ? fromLocalityStopIds
      : [stopIdFromName(canonicalizeStopName(from, aliases))];
  const resolvedToStopId = toStopId ?? stopIdFromName(canonicalizeStopName(to, aliases));

  return trips
    .filter((trip) => trip.dayType === dayType)
    .flatMap((trip) =>
      resolvedOriginStopIds.map((originStopId) => {
        const fromIndex = trip.stops.findIndex(
          (stop) => (stop.stopId ?? stopIdFromName(stop.name)) === originStopId,
        );
        const toIndex = trip.stops.findIndex(
          (stop) => (stop.stopId ?? stopIdFromName(stop.name)) === resolvedToStopId,
        );

        if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
          return null;
        }

        const fromStop = trip.stops[fromIndex];
        const toStop = trip.stops[toIndex];

        return {
          lineId: trip.lineId,
          sourcePage: trip.sourcePage,
          fromStopId: originStopId,
          toStopId: resolvedToStopId,
          departureTime: fromStop.time,
          arrivalTime: toStop.time,
          durationMinutes: durationBetween(fromStop.time, toStop.time),
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

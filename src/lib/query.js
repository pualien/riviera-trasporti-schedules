import { canonicalizeStopName } from './normalize.js';
import { durationBetween, toMinutes } from './time.js';

export function findDirectTrips({ from, to, dayType, aliases, trips }) {
  const fromName = canonicalizeStopName(from, aliases);
  const toName = canonicalizeStopName(to, aliases);

  return trips
    .filter((trip) => trip.dayType === dayType)
    .map((trip) => {
      const fromIndex = trip.stops.findIndex((stop) => stop.name === fromName);
      const toIndex = trip.stops.findIndex((stop) => stop.name === toName);

      if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
        return null;
      }

      const fromStop = trip.stops[fromIndex];
      const toStop = trip.stops[toIndex];

      return {
        lineId: trip.lineId,
        sourcePage: trip.sourcePage,
        departureTime: fromStop.time,
        arrivalTime: toStop.time,
        durationMinutes: durationBetween(fromStop.time, toStop.time),
      };
    })
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

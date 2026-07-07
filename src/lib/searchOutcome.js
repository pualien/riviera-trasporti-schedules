import { splitRemainingDepartures } from './serviceDay.js';
import { toMinutes } from './time.js';

function averageDuration(matches) {
  return Math.round(
    matches.reduce((sum, match) => sum + match.durationMinutes, 0) / matches.length,
  );
}

function uniqueLines(matches) {
  return [...new Set(matches.map((match) => match.lineId))];
}

function minutesUntilDeparture(departure, now) {
  const nowMinutes = (now.getHours() * 60) + now.getMinutes();
  return Math.max(0, toMinutes(departure.departureTime) - nowMinutes);
}

function withDepartureCountdown(departure, now) {
  return {
    ...departure,
    minutesUntilDeparture: minutesUntilDeparture(departure, now),
  };
}

function buildFallbackSuggestions({
  fromLocalityId,
  fromStopId,
  localities,
  reachability,
  stops,
}) {
  if (!fromLocalityId) {
    return [];
  }

  const locality = localities.find((entry) => entry.id === fromLocalityId);

  if (!locality) {
    return [];
  }

  if (fromStopId) {
    return locality.stopIds
      .filter((stopId) => stopId !== fromStopId)
      .filter((stopId) => (reachability[stopId] ?? []).length > 0)
      .map((stopId) => stops.find((stop) => stop.id === stopId))
      .filter(Boolean)
      .map((stop) => ({
        kind: 'origin-stop',
        stopId: stop.id,
        label: stop.canonical,
        action: { type: 'set-origin-stop', stopId: stop.id },
      }))
      .slice(0, 3);
  }

  return locality.stopIds
    .flatMap((stopId) => reachability[stopId] ?? [])
    .filter((stopId, index, allIds) => allIds.indexOf(stopId) === index)
    .map((stopId) => stops.find((stop) => stop.id === stopId))
    .filter(Boolean)
    .map((stop) => ({
      kind: 'destination-stop',
      stopId: stop.id,
      label: stop.canonical,
      action: { type: 'set-destination-stop', stopId: stop.id },
    }))
    .slice(0, 3);
}

export function buildSearchOutcome({
  matches,
  now = new Date(),
  fromLocalityId = null,
  fromStopId = null,
  localities = [],
  reachability = {},
  stops = [],
}) {
  if (!matches.length) {
    return {
      type: 'no-direct',
      suggestions: buildFallbackSuggestions({
        fromLocalityId,
        fromStopId,
        localities,
        reachability,
        stops,
      }),
    };
  }

  const { remaining, serviceEnded } = splitRemainingDepartures(matches, now);
  const remainingByArrival = [...remaining].sort(
    (left, right) => toMinutes(left.arrivalTime) - toMinutes(right.arrivalTime),
  );

  return {
    type: 'results',
    summary: {
      serviceEnded,
      nextDeparture: remaining[0] ?? null,
      soonestArrival: remainingByArrival[0] ?? null,
      lastDepartureTime: matches.at(-1)?.departureTime ?? null,
      averageDurationMinutes: averageDuration(matches),
      lines: uniqueLines(matches),
    },
    nextDepartures: remaining.slice(0, 3).map((departure) => withDepartureCountdown(departure, now)),
    allDepartures: matches,
  };
}

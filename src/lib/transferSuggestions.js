import { durationBetween, toMinutes } from './time.js';

const MIN_TRANSFER_MINUTES = 5;
const MAX_TRANSFER_SUGGESTIONS = 3;

function currentServiceMinutes(now) {
  return (now.getHours() * 60) + now.getMinutes();
}

function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function compareSuggestions(left, right) {
  return toMinutes(left.firstLeg.departureTime) - toMinutes(right.firstLeg.departureTime)
    || left.totalDurationMinutes - right.totalDurationMinutes
    || left.waitMinutes - right.waitMinutes
    || compareText(left.firstLeg.lineId, right.firstLeg.lineId)
    || compareText(left.secondLeg.lineId, right.secondLeg.lineId)
    || compareText(left.transferStopId, right.transferStopId);
}

function suggestionDisplayKey(suggestion) {
  return [
    suggestion.firstLeg.fromStopId,
    suggestion.transferStopId,
    suggestion.secondLeg.toStopId,
    suggestion.firstLeg.lineId,
    suggestion.secondLeg.lineId,
    suggestion.firstLeg.departureTime,
    suggestion.firstLeg.arrivalTime,
    suggestion.secondLeg.departureTime,
    suggestion.secondLeg.arrivalTime,
    suggestion.firstLeg.sourcePage,
    suggestion.secondLeg.sourcePage,
  ].join('|');
}

function uniqueSuggestions(suggestions) {
  const seen = new Set();

  return suggestions.filter((suggestion) => {
    const key = suggestionDisplayKey(suggestion);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sameDayTrips(trips, dayType) {
  return trips.filter((trip) => trip.dayType === dayType);
}

function firstLegsForTrip(trip, originStopIds, toStopId) {
  return trip.stops.flatMap((originStop, originIndex) => {
    if (!originStopIds.has(originStop.stopId)) {
      return [];
    }

    return trip.stops
      .slice(originIndex + 1)
      .filter((transferStop) => transferStop.stopId !== toStopId)
      .map((transferStop) => ({
        lineId: trip.lineId,
        direction: trip.direction,
        fromStopId: originStop.stopId,
        departureStopId: originStop.stopId,
        departureStopName: originStop.name,
        departureTime: originStop.time,
        arrivalTime: transferStop.time,
        transferStopId: transferStop.stopId,
        transferStopName: transferStop.name,
        sourcePage: trip.sourcePage,
      }));
  });
}

function secondLegsForTransfer(trips, transferStopId, toStopId, earliestDepartureMinutes) {
  return trips.flatMap((trip) => {
    const transferIndex = trip.stops.findIndex((stop) => stop.stopId === transferStopId);

    if (transferIndex < 0) {
      return [];
    }

    const destinationStop = trip.stops
      .slice(transferIndex + 1)
      .find((stop) => stop.stopId === toStopId);

    if (!destinationStop) {
      return [];
    }

    const transferStop = trip.stops[transferIndex];

    if (toMinutes(transferStop.time) < earliestDepartureMinutes) {
      return [];
    }

    return [{
      lineId: trip.lineId,
      direction: trip.direction,
      departureTime: transferStop.time,
      toStopId: destinationStop.stopId,
      arrivalStopId: destinationStop.stopId,
      arrivalStopName: destinationStop.name,
      arrivalTime: destinationStop.time,
      sourcePage: trip.sourcePage,
    }];
  }).sort((left, right) => (
    toMinutes(left.departureTime) - toMinutes(right.departureTime)
    || toMinutes(left.arrivalTime) - toMinutes(right.arrivalTime)
    || compareText(left.lineId, right.lineId)
    || compareText(left.sourcePage, right.sourcePage)
  ));
}

function buildSuggestions({ trips, originStopIds, toStopId }) {
  return trips.flatMap((trip) => firstLegsForTrip(trip, originStopIds, toStopId))
    .flatMap((firstLeg) => {
      const secondLeg = secondLegsForTransfer(
        trips,
        firstLeg.transferStopId,
        toStopId,
        toMinutes(firstLeg.arrivalTime) + MIN_TRANSFER_MINUTES,
      )[0];

      if (!secondLeg) {
        return [];
      }

      return [{
        transferStopId: firstLeg.transferStopId,
        transferStopName: firstLeg.transferStopName,
        waitMinutes: durationBetween(firstLeg.arrivalTime, secondLeg.departureTime),
        totalDurationMinutes: durationBetween(firstLeg.departureTime, secondLeg.arrivalTime),
        firstLeg,
        secondLeg,
      }];
    });
}

export function findOneTransferSuggestions({
  trips = [],
  fromStopIds = [],
  toStopId = null,
  dayType = 'feriale',
  now = new Date(),
} = {}) {
  const originStopIds = new Set(fromStopIds.filter(Boolean));

  if (!originStopIds.size || !toStopId) {
    return [];
  }

  const suggestions = buildSuggestions({
    trips: sameDayTrips(trips, dayType),
    originStopIds,
    toStopId,
  }).sort(compareSuggestions);
  const serviceMinutes = currentServiceMinutes(now);
  const futureSuggestions = suggestions.filter(
    (suggestion) => toMinutes(suggestion.firstLeg.departureTime) >= serviceMinutes,
  );
  const selectedSuggestions = futureSuggestions.length
    ? futureSuggestions.map((suggestion) => ({ ...suggestion, isFuture: true }))
    : suggestions.map((suggestion) => ({ ...suggestion, isFuture: false }));

  return uniqueSuggestions(selectedSuggestions).slice(0, MAX_TRANSFER_SUGGESTIONS);
}

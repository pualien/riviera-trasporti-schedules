import {
  buildReachability,
  createStopRecord,
  deriveLocalitiesFromRules,
  mergeLocalities,
  stopIdFromName,
  validateLocalities,
} from '../../build-route-data.mjs';

function parseGtfsDate(value) {
  const match = String(value ?? '').match(/^(\d{4})(\d{2})(\d{2})$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function normalizeTime(value) {
  const match = String(value ?? '').match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    return null;
  }

  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function dayTypeForService(calendarEntry) {
  if (!calendarEntry) {
    return 'giornaliero';
  }

  const weekdayActive = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    .some((day) => calendarEntry[day] === '1');
  const saturdayActive = calendarEntry.saturday === '1';
  const sundayActive = calendarEntry.sunday === '1';

  if (weekdayActive && !saturdayActive && !sundayActive) {
    return 'feriale';
  }

  if (!weekdayActive && (saturdayActive || sundayActive)) {
    return 'festivo';
  }

  return 'giornaliero';
}

function serviceRange(calendar = []) {
  const starts = calendar.map((entry) => parseGtfsDate(entry.start_date)).filter(Boolean).sort();
  const ends = calendar.map((entry) => parseGtfsDate(entry.end_date)).filter(Boolean).sort();

  return {
    validFrom: starts[0] ?? null,
    validUntil: ends.at(-1) ?? null,
  };
}

function sortedStopTimes(stopTimes) {
  return [...stopTimes].sort((left, right) =>
    Number(left.stop_sequence) - Number(right.stop_sequence),
  );
}

function buildStops(gtfsStops, aliases) {
  return gtfsStops.map((stop) => {
    const canonical = stop.stop_name;
    return createStopRecord(canonical, aliases[canonical.toLowerCase()] ?? aliases[canonical] ?? []);
  });
}

function buildCoordinates(gtfsStops) {
  return Object.fromEntries(
    gtfsStops
      .map((stop) => {
        const latitude = Number(stop.stop_lat);
        const longitude = Number(stop.stop_lon);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }

        return [stopIdFromName(stop.stop_name), { latitude, longitude }];
      })
      .filter(Boolean),
  );
}

function buildLines(routes) {
  return routes.map((route) => ({
    lineId: route.route_short_name || route.route_id,
    pages: [],
  }));
}

function buildTrips({ routesById, trips, stopTimesByTripId, stopsById, calendarByServiceId }) {
  return trips.flatMap((trip, tripIndex) => {
    const route = routesById.get(trip.route_id);
    const stopTimes = sortedStopTimes(stopTimesByTripId.get(trip.trip_id) ?? []);

    if (!route || !stopTimes.length) {
      return [];
    }

    const stops = stopTimes.map((stopTime) => {
      const stop = stopsById.get(stopTime.stop_id);
      const time = normalizeTime(stopTime.departure_time || stopTime.arrival_time);

      if (!stop || !time) {
        return null;
      }

      return {
        name: stop.stop_name,
        time,
        stopId: stopIdFromName(stop.stop_name),
      };
    });

    if (stops.some((stop) => !stop)) {
      return [];
    }

    return [{
      lineId: route.route_short_name || route.route_id,
      direction: trip.trip_headsign || route.route_long_name || '',
      dayType: dayTypeForService(calendarByServiceId.get(trip.service_id)),
      sourcePage: null,
      tripIndex,
      stops,
    }];
  });
}

export function normalizeGtfsData({
  feed,
  aliases = {},
  localities = [],
  localityRules = [],
  sourceUrl,
  builtAt = new Date().toISOString(),
}) {
  const routesById = new Map(feed.routes.map((route) => [route.route_id, route]));
  const stopsById = new Map(feed.stops.map((stop) => [stop.stop_id, stop]));
  const calendarByServiceId = new Map(feed.calendar.map((entry) => [entry.service_id, entry]));
  const stopTimesByTripId = new Map();

  for (const stopTime of feed.stopTimes) {
    const entries = stopTimesByTripId.get(stopTime.trip_id) ?? [];
    entries.push(stopTime);
    stopTimesByTripId.set(stopTime.trip_id, entries);
  }

  const stops = buildStops(feed.stops, aliases);
  const trips = buildTrips({
    routesById,
    trips: feed.trips,
    stopTimesByTripId,
    stopsById,
    calendarByServiceId,
  });
  const generatedLocalities = deriveLocalitiesFromRules(localityRules, stops);
  const validatedLocalities = validateLocalities(mergeLocalities(localities, generatedLocalities), stops);
  const { validFrom, validUntil } = serviceRange(feed.calendar);

  return {
    lines: buildLines(feed.routes),
    stops,
    trips,
    localities: validatedLocalities,
    reachability: buildReachability(trips),
    stopCoordinates: buildCoordinates(feed.stops),
    metadata: {
      source: {
        type: 'gtfs',
        title: 'Regione Liguria GTFS planned-service feed',
        url: sourceUrl,
        publisher: feed.agency[0]?.agency_name ?? 'Regione Liguria',
        releasedAt: null,
        validFrom,
        validUntil,
        referencePdf: null,
      },
      builtAt,
      coverage: {
        routeCount: feed.routes.length,
        stopCount: feed.stops.length,
        tripCount: trips.length,
        stopTimeCount: feed.stopTimes.length,
      },
    },
  };
}

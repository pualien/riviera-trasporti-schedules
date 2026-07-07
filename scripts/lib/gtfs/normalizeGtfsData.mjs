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

function activeDaysForCalendarDates(calendarDateEntries = []) {
  const days = new Set();

  for (const entry of calendarDateEntries) {
    if (entry.exception_type === '2') {
      continue;
    }

    const date = parseGtfsDate(entry.date);
    if (!date) {
      continue;
    }

    days.add(new Date(`${date}T12:00:00Z`).getUTCDay());
  }

  return days;
}

function dayTypeFromActiveDays(activeDays) {
  const weekdayActive = [1, 2, 3, 4, 5].some((day) => activeDays.has(day));
  const saturdayActive = activeDays.has(6);
  const sundayActive = activeDays.has(0);

  if (weekdayActive && !saturdayActive && !sundayActive) {
    return 'feriale';
  }

  if (!weekdayActive && (saturdayActive || sundayActive)) {
    return 'festivo';
  }

  return 'giornaliero';
}

function dayTypeForService(calendarEntry, calendarDateEntries = [], serviceId = '') {
  if (String(serviceId).includes('SCO')) {
    return 'scolastico';
  }

  if (!calendarEntry) {
    const activeDays = activeDaysForCalendarDates(calendarDateEntries);
    return activeDays.size ? dayTypeFromActiveDays(activeDays) : 'giornaliero';
  }

  const activeDays = new Set();
  if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    .some((day) => calendarEntry[day] === '1')) {
    [1, 2, 3, 4, 5].forEach((day) => activeDays.add(day));
  }
  if (calendarEntry.saturday === '1') activeDays.add(6);
  if (calendarEntry.sunday === '1') activeDays.add(0);

  return dayTypeFromActiveDays(activeDays);
}

function serviceRange({ calendar = [], calendarDates = [], feedInfo = [] } = {}) {
  const feed = feedInfo[0] ?? {};
  const feedStart = parseGtfsDate(feed.feed_start_date);
  const feedEnd = parseGtfsDate(feed.feed_end_date);

  if (feedStart || feedEnd) {
    return {
      validFrom: feedStart,
      validUntil: feedEnd,
    };
  }

  const starts = calendar.map((entry) => parseGtfsDate(entry.start_date)).filter(Boolean).sort();
  const ends = calendar.map((entry) => parseGtfsDate(entry.end_date)).filter(Boolean).sort();
  const activeDates = calendarDates
    .filter((entry) => entry.exception_type !== '2')
    .map((entry) => parseGtfsDate(entry.date))
    .filter(Boolean)
    .sort();

  return {
    validFrom: starts[0] ?? activeDates[0] ?? null,
    validUntil: ends.at(-1) ?? activeDates.at(-1) ?? null,
  };
}

function sortedStopTimes(stopTimes) {
  return [...stopTimes].sort((left, right) =>
    Number(left.stop_sequence) - Number(right.stop_sequence),
  );
}

function gtfsStopId(stop, stopIdOverrides = {}) {
  return stopIdOverrides[stop.stop_name] ?? stopIdFromName(stop.stop_name);
}

function variantListForStop(rawCanonical, publicCanonical, aliases, labelOverride) {
  const aliasVariants = aliases[rawCanonical.toLowerCase()] ?? aliases[rawCanonical] ?? [];
  const variants = [
    ...(labelOverride?.variants ?? []),
    ...aliasVariants,
  ];

  if (publicCanonical !== rawCanonical) {
    variants.push(rawCanonical);
  }

  const publicCanonicalKey = publicCanonical.toLowerCase();
  const seen = new Set();

  return variants.filter((variant) => {
    const key = String(variant).toLowerCase();
    if (!key || key === publicCanonicalKey || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildStops(gtfsStops, aliases, stopIdOverrides, stopLabelOverrides) {
  return gtfsStops.map((stop) => {
    const id = gtfsStopId(stop, stopIdOverrides);
    const rawCanonical = stop.stop_name;
    const labelOverride = stopLabelOverrides[id] ?? stopLabelOverrides[rawCanonical];
    const canonical = labelOverride?.canonical ?? rawCanonical;

    return {
      ...createStopRecord(
        canonical,
        variantListForStop(rawCanonical, canonical, aliases, labelOverride),
      ),
      id,
    };
  });
}

function buildCoordinates(gtfsStops, stopIdOverrides) {
  return Object.fromEntries(
    gtfsStops
      .map((stop) => {
        const latitude = Number(stop.stop_lat);
        const longitude = Number(stop.stop_lon);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }

        return [gtfsStopId(stop, stopIdOverrides), { latitude, longitude }];
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

function buildTrips({
  routesById,
  trips,
  stopTimesByTripId,
  stopsById,
  calendarByServiceId,
  calendarDatesByServiceId,
  stopIdOverrides,
}) {
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
        stopId: gtfsStopId(stop, stopIdOverrides),
      };
    });

    if (stops.some((stop) => !stop)) {
      return [];
    }

    return [{
      lineId: route.route_short_name || route.route_id,
      direction: trip.trip_headsign || route.route_long_name || '',
      dayType: dayTypeForService(
        calendarByServiceId.get(trip.service_id),
        calendarDatesByServiceId.get(trip.service_id) ?? [],
        trip.service_id,
      ),
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
  stopIdOverrides = {},
  stopLabelOverrides = {},
  sourceUrl,
  builtAt = new Date().toISOString(),
}) {
  const routesById = new Map(feed.routes.map((route) => [route.route_id, route]));
  const stopsById = new Map(feed.stops.map((stop) => [stop.stop_id, stop]));
  const calendarByServiceId = new Map(feed.calendar.map((entry) => [entry.service_id, entry]));
  const calendarDatesByServiceId = new Map();
  const stopTimesByTripId = new Map();

  for (const calendarDate of feed.calendarDates) {
    const entries = calendarDatesByServiceId.get(calendarDate.service_id) ?? [];
    entries.push(calendarDate);
    calendarDatesByServiceId.set(calendarDate.service_id, entries);
  }

  for (const stopTime of feed.stopTimes) {
    const entries = stopTimesByTripId.get(stopTime.trip_id) ?? [];
    entries.push(stopTime);
    stopTimesByTripId.set(stopTime.trip_id, entries);
  }

  const stops = buildStops(feed.stops, aliases, stopIdOverrides, stopLabelOverrides);
  const trips = buildTrips({
    routesById,
    trips: feed.trips,
    stopTimesByTripId,
    stopsById,
    calendarByServiceId,
    calendarDatesByServiceId,
    stopIdOverrides,
  });
  const generatedLocalities = deriveLocalitiesFromRules(localityRules, stops);
  const validatedLocalities = validateLocalities(mergeLocalities(localities, generatedLocalities), stops);
  const { validFrom, validUntil } = serviceRange({
    calendar: feed.calendar,
    calendarDates: feed.calendarDates,
    feedInfo: feed.feedInfo,
  });

  return {
    lines: buildLines(feed.routes),
    stops,
    trips,
    localities: validatedLocalities,
    reachability: buildReachability(trips),
    stopCoordinates: buildCoordinates(feed.stops, stopIdOverrides),
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

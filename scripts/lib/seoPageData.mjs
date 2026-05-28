function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function compareLineIds(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), undefined, { numeric: true });
}

export function slugifySegment(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function localitiesByStopId(localities = []) {
  const map = new Map();

  for (const locality of localities) {
    for (const stopId of locality.stopIds ?? []) {
      if (stopId && !map.has(stopId)) {
        map.set(stopId, locality);
      }
    }
  }

  return map;
}

function uniqueSorted(values, compare = compareText) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ''))].sort(compare);
}

function parseTimeMinutes(value) {
  const match = String(value ?? '').match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function isForwardTimeSegment(departureTime, arrivalTime) {
  const departureMinutes = parseTimeMinutes(departureTime);
  const arrivalMinutes = parseTimeMinutes(arrivalTime);

  return departureMinutes === null || arrivalMinutes === null || arrivalMinutes >= departureMinutes;
}

function stopLabel(stopById, tripStop = {}) {
  return stopById.get(tripStop.stopId)?.canonical ?? tripStop.name ?? tripStop.stopId ?? '';
}

function uniqueSlug(baseValue, fallbackValue, usedSlugs, genericFallback) {
  const baseSlug = slugifySegment(baseValue);
  const fallbackSlug = slugifySegment(fallbackValue);
  let candidate = baseSlug || fallbackSlug || genericFallback;

  if (usedSlugs.has(candidate)) {
    candidate = fallbackSlug && fallbackSlug !== baseSlug ? fallbackSlug : candidate;
  }

  if (usedSlugs.has(candidate)) {
    const root = candidate;
    let suffix = 2;

    while (usedSlugs.has(`${root}-${suffix}`)) {
      suffix += 1;
    }

    candidate = `${root}-${suffix}`;
  }

  usedSlugs.add(candidate);
  return candidate;
}

function localitySlugMap(localities = []) {
  const usedSlugs = new Set();
  const slugByLocalityId = new Map();

  for (const locality of localities) {
    slugByLocalityId.set(locality.id, uniqueSlug(locality.label, locality.id, usedSlugs, 'place'));
  }

  return slugByLocalityId;
}

export function buildRoutePageCandidates({ trips = [], localities = [], limit = 50 } = {}) {
  const localityByStopId = localitiesByStopId(localities);
  const slugByLocalityId = localitySlugMap(localities);
  const candidates = new Map();

  for (const trip of trips) {
    const tripStops = trip.stops ?? [];
    const seenTripLocalityPairs = new Set();

    for (let fromIndex = 0; fromIndex < tripStops.length; fromIndex += 1) {
      const fromLocality = localityByStopId.get(tripStops[fromIndex].stopId);

      if (!fromLocality) {
        continue;
      }

      for (let toIndex = fromIndex + 1; toIndex < tripStops.length; toIndex += 1) {
        const toLocality = localityByStopId.get(tripStops[toIndex].stopId);

        if (!toLocality || toLocality.id === fromLocality.id) {
          continue;
        }

        if (!isForwardTimeSegment(tripStops[fromIndex].time, tripStops[toIndex].time)) {
          continue;
        }

        const key = `${fromLocality.id}->${toLocality.id}`;

        if (seenTripLocalityPairs.has(key)) {
          continue;
        }

        seenTripLocalityPairs.add(key);

        const fromSlug = slugByLocalityId.get(fromLocality.id) ?? slugifySegment(fromLocality.id) ?? 'place';
        const toSlug = slugByLocalityId.get(toLocality.id) ?? slugifySegment(toLocality.id) ?? 'place';

        if (!candidates.has(key)) {
          candidates.set(key, {
            fromLocalityId: fromLocality.id,
            fromLabel: fromLocality.label,
            fromSlug,
            toLocalityId: toLocality.id,
            toLabel: toLocality.label,
            toSlug,
            slug: `${fromSlug}/${toSlug}`,
            lineIds: new Set(),
            dayTypes: new Set(),
            departureCount: 0,
            departures: [],
          });
        }

        const candidate = candidates.get(key);
        candidate.lineIds.add(trip.lineId);
        candidate.dayTypes.add(trip.dayType);
        candidate.departureCount += 1;
        candidate.departures.push({
          lineId: trip.lineId,
          dayType: trip.dayType,
          direction: trip.direction,
          sourcePage: trip.sourcePage,
          departureTime: tripStops[fromIndex].time,
          arrivalTime: tripStops[toIndex].time,
        });
      }
    }
  }

  return [...candidates.values()]
    .map((candidate) => ({
      ...candidate,
      lineIds: uniqueSorted([...candidate.lineIds], compareLineIds),
      dayTypes: uniqueSorted([...candidate.dayTypes]),
      departures: candidate.departures
        .sort(
          (left, right) =>
            compareText(left.departureTime, right.departureTime) ||
            compareText(left.arrivalTime, right.arrivalTime) ||
            compareLineIds(left.lineId, right.lineId),
        )
        .slice(0, 12),
    }))
    .sort((left, right) => right.departureCount - left.departureCount || compareText(left.slug, right.slug))
    .slice(0, limit);
}

export function buildPlacePageSummaries({ trips = [], localities = [] } = {}) {
  const localityByStopId = localitiesByStopId(localities);
  const slugByLocalityId = localitySlugMap(localities);
  const summaries = new Map(
    localities.map((locality) => [
      locality.id,
      {
        localityId: locality.id,
        label: locality.label,
        slug: slugByLocalityId.get(locality.id),
        stopIds: locality.stopIds ?? [],
        directDestinations: new Map(),
        lineIds: new Set(),
      },
    ]),
  );

  for (const trip of trips) {
    const tripStops = trip.stops ?? [];

    for (let fromIndex = 0; fromIndex < tripStops.length; fromIndex += 1) {
      const fromLocality = localityByStopId.get(tripStops[fromIndex].stopId);

      if (!fromLocality || !summaries.has(fromLocality.id)) {
        continue;
      }

      const summary = summaries.get(fromLocality.id);
      summary.lineIds.add(trip.lineId);

      for (let toIndex = fromIndex + 1; toIndex < tripStops.length; toIndex += 1) {
        const toLocality = localityByStopId.get(tripStops[toIndex].stopId);

        if (!toLocality || toLocality.id === fromLocality.id) {
          continue;
        }

        summary.directDestinations.set(toLocality.id, {
          id: toLocality.id,
          label: toLocality.label,
          slug: slugByLocalityId.get(toLocality.id),
        });
      }
    }
  }

  return [...summaries.values()]
    .map((summary) => ({
      ...summary,
      directDestinations: [...summary.directDestinations.values()].sort((left, right) =>
        compareText(left.label, right.label),
      ),
      lineIds: uniqueSorted([...summary.lineIds], compareLineIds),
    }))
    .filter((summary) => summary.directDestinations.length || summary.lineIds.length)
    .sort((left, right) => compareText(left.label, right.label));
}

export function buildLinePageSummaries({ trips = [], stops = [] } = {}) {
  const stopById = new Map(stops.map((stop) => [stop.id, stop]));
  const summaries = new Map();
  const usedLineSlugs = new Set();

  for (const trip of trips) {
    if (!summaries.has(trip.lineId)) {
      summaries.set(trip.lineId, {
        lineId: trip.lineId,
        slug: uniqueSlug(trip.lineId, trip.lineId, usedLineSlugs, 'line'),
        directions: new Set(),
        stopIds: new Set(),
        stops: [],
        dayTypes: new Set(),
        sourcePages: new Set(),
        departures: [],
      });
    }

    const summary = summaries.get(trip.lineId);
    summary.directions.add(trip.direction);
    summary.dayTypes.add(trip.dayType);
    summary.sourcePages.add(trip.sourcePage);

    const tripStops = trip.stops ?? [];
    const firstStop = tripStops[0];
    const lastStop = tripStops.at(-1);

    if (
      firstStop?.stopId &&
      lastStop?.stopId &&
      firstStop.stopId !== lastStop.stopId &&
      isForwardTimeSegment(firstStop.time, lastStop.time)
    ) {
      summary.departures.push({
        dayType: trip.dayType,
        direction: trip.direction,
        departureTime: firstStop.time,
        arrivalTime: lastStop.time,
        fromLabel: stopLabel(stopById, firstStop),
        toLabel: stopLabel(stopById, lastStop),
        sourcePage: trip.sourcePage,
      });
    }

    for (const tripStop of tripStops) {
      if (!tripStop.stopId || summary.stopIds.has(tripStop.stopId)) {
        continue;
      }

      summary.stopIds.add(tripStop.stopId);
      summary.stops.push({
        id: tripStop.stopId,
        canonical: stopById.get(tripStop.stopId)?.canonical ?? tripStop.name,
      });
    }
  }

  return [...summaries.values()]
    .map((summary) => ({
      ...summary,
      directions: uniqueSorted([...summary.directions]),
      dayTypes: uniqueSorted([...summary.dayTypes]),
      sourcePages: uniqueSorted([...summary.sourcePages], (left, right) => Number(left) - Number(right)),
      departures: summary.departures
        .sort(
          (left, right) =>
            compareText(left.departureTime, right.departureTime) ||
            compareText(left.arrivalTime, right.arrivalTime) ||
            compareText(left.dayType, right.dayType) ||
            compareText(left.direction, right.direction),
        )
        .slice(0, 12),
    }))
    .sort((left, right) => compareLineIds(left.lineId, right.lineId));
}

const SOURCE_ENDS_SOON_DAYS = 21;

function daysUntil(dateString, now) {
  const target = new Date(`${dateString}T23:59:59.999Z`);
  if (Number.isNaN(target.getTime())) {
    return null;
  }

  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function directPairCount(reachability = {}) {
  return Object.values(reachability).reduce((sum, destinations) => sum + destinations.length, 0);
}

function issue(code, message) {
  return { code, message };
}

function unassignedStopCount(stops = [], localities = []) {
  const assignedStopIds = new Set(localities.flatMap((locality) => locality.stopIds ?? []));
  return stops.filter((stop) => !assignedStopIds.has(stop.id)).length;
}

export function validateGtfsRuntimeData({ runtimeData, now = new Date() }) {
  const counts = {
    lines: runtimeData.lines?.length ?? 0,
    stops: runtimeData.stops?.length ?? 0,
    trips: runtimeData.trips?.length ?? 0,
    localities: runtimeData.localities?.length ?? 0,
    directPairs: directPairCount(runtimeData.reachability),
  };
  const errors = [];
  const warnings = [];
  const source = runtimeData.metadata?.source ?? {};
  const validUntilDays = source.validUntil ? daysUntil(source.validUntil, now) : null;

  if (!counts.lines) errors.push(issue('NO_LINES', 'Generated GTFS data has no lines.'));
  if (!counts.stops) errors.push(issue('NO_STOPS', 'Generated GTFS data has no stops.'));
  if (!counts.trips) errors.push(issue('NO_TRIPS', 'Generated GTFS data has no trips.'));
  if (!counts.directPairs) errors.push(issue('NO_DIRECT_PAIRS', 'Generated GTFS data has no direct stop pairs.'));
  if (!source.validFrom || !source.validUntil) {
    errors.push(issue('SOURCE_VALIDITY_MISSING', 'GTFS source validity range is missing.'));
  }
  if (validUntilDays !== null && validUntilDays < 0) {
    errors.push(issue('SOURCE_EXPIRED', 'GTFS source validity range has already ended.'));
  }
  if (validUntilDays !== null && validUntilDays >= 0 && validUntilDays <= SOURCE_ENDS_SOON_DAYS) {
    warnings.push(issue('SOURCE_ENDS_SOON', 'GTFS source validity range ends soon.'));
  }
  if (unassignedStopCount(runtimeData.stops, runtimeData.localities) > 0) {
    warnings.push(issue('UNASSIGNED_STOPS', 'Some stops are not assigned to a locality.'));
  }

  return {
    status: errors.length ? 'failed' : warnings.length ? 'warning' : 'fresh',
    generatedAt: now.toISOString(),
    source: {
      type: source.type ?? 'unknown',
      validFrom: source.validFrom ?? null,
      validUntil: source.validUntil ?? null,
    },
    counts,
    errors,
    warnings,
  };
}

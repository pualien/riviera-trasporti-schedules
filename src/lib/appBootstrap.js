import { defaultDayTypeForDate } from './serviceDay.js';

export async function loadAppBootstrapData({
  fetchJson,
  fetchJsonOrNull,
  now = new Date(),
}) {
  const [
    trips,
    stops,
    stopCoordinates,
    generatedLocalities,
    generatedReachability,
    manualLocalities,
    metadata,
  ] = await Promise.all([
    fetchJson('./assets/data/trips.json'),
    fetchJson('./assets/data/stops.json'),
    fetchJsonOrNull('./assets/data/stop-coordinates.json'),
    fetchJsonOrNull('./assets/data/localities.json'),
    fetchJsonOrNull('./assets/data/reachability.json'),
    fetchJsonOrNull('./data/manual/localities.json'),
    fetchJsonOrNull('./assets/data/metadata.json'),
  ]);

  return {
    trips,
    stops,
    stopCoordinates: stopCoordinates ?? {},
    generatedLocalities,
    generatedReachability,
    manualLocalities,
    metadata,
    formValues: {
      fromInput: '',
      fromLocalityId: null,
      fromStopId: null,
      toInput: '',
      toStopId: null,
      dayType: defaultDayTypeForDate(now),
    },
  };
}

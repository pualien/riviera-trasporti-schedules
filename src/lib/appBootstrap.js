import { defaultDayTypeForDate } from './serviceDay.js';

async function optionalJson(fetchJsonOrNull, url) {
  try {
    return await fetchJsonOrNull(url);
  } catch (error) {
    return null;
  }
}

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
    dataQuality,
  ] = await Promise.all([
    fetchJson('./assets/data/trips.json'),
    fetchJson('./assets/data/stops.json'),
    optionalJson(fetchJsonOrNull, './assets/data/stop-coordinates.json'),
    optionalJson(fetchJsonOrNull, './assets/data/localities.json'),
    optionalJson(fetchJsonOrNull, './assets/data/reachability.json'),
    optionalJson(fetchJsonOrNull, './data/manual/localities.json'),
    optionalJson(fetchJsonOrNull, './assets/data/metadata.json'),
    optionalJson(fetchJsonOrNull, './assets/data/data-quality.json'),
  ]);

  return {
    trips,
    stops,
    stopCoordinates: stopCoordinates ?? {},
    generatedLocalities,
    generatedReachability,
    manualLocalities,
    metadata,
    dataQuality,
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

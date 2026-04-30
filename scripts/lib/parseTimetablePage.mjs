const TIME_RE = /\b\d{2}\.\d{2}\b/g;

function normalizeTime(value) {
  return value.replace('.', ':');
}

function normalizeStopLabel(value) {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseTimetablePage({ pageNumber, lineId, direction, dayType, pageText }) {
  const rows = pageText
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean)
    .filter((row) => !row.startsWith('LINEA ') && !/^([A-Z-]+\s?)+$/.test(row));

  const parsedRows = rows.map((row) => {
    const times = row.match(TIME_RE) ?? [];
    const stopName = row.replace(TIME_RE, '').replace(/\s+/g, ' ').trim();

    return {
      stopName: normalizeStopLabel(stopName),
      times: times.map(normalizeTime),
    };
  });

  const tripCount = parsedRows[0]?.times.length ?? 0;

  return Array.from({ length: tripCount }, (_, tripIndex) => ({
    lineId,
    direction,
    dayType,
    sourcePage: pageNumber,
    stops: parsedRows
      .map((row) => ({
        name: row.stopName,
        time: row.times[tripIndex],
      }))
      .filter((stop) => stop.time),
  }));
}

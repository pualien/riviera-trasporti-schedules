const TIME_RE = /\b\d{2}\.\d{2}\b/g;
const TIME_OR_DASH_RE = /^(\d{2}\.\d{2}|-)$/;
const ROW_TOLERANCE = 0.75;
const COLUMN_TOLERANCE = 12;

function normalizeTime(value) {
  return value.replace('.', ':');
}

function normalizeStopLabel(value) {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTextRows(pageText) {
  return pageText
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean)
    .filter((row) => !row.startsWith('LINEA ') && !/^([A-Z-]+\s?)+$/.test(row));
}

function groupItemsIntoRows(pageItems) {
  const rows = [];

  const sortedItems = pageItems
    .filter((item) => item.str.trim())
    .sort((left, right) => right.y - left.y || left.x - right.x);

  for (const item of sortedItems) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= ROW_TOLERANCE);

    if (row) {
      row.items.push(item);
      row.y = (row.y + item.y) / 2;
      continue;
    }

    rows.push({ y: item.y, items: [item] });
  }

  return rows.map((row) => row.items.sort((left, right) => left.x - right.x));
}

function parseItemRows(pageItems) {
  const rows = groupItemsIntoRows(pageItems);

  return rows
    .map((items) => {
      const firstCellIndex = items.findIndex((item) => TIME_OR_DASH_RE.test(item.str.trim()));

      if (firstCellIndex === -1) {
        return null;
      }

      const stopName = items
        .slice(0, firstCellIndex)
        .map((item) => item.str.trim())
        .filter(Boolean)
        .join(' ');

      if (!stopName || stopName.startsWith('(') || stopName.toLowerCase().startsWith('pagina ')) {
        return null;
      }

      return {
        stopName: normalizeStopLabel(stopName),
        cells: items
          .slice(firstCellIndex)
          .map((item) => ({ value: item.str.trim(), item }))
          .filter(({ value }) => TIME_OR_DASH_RE.test(value))
          .map(({ value, item }) => ({
            x: item.x,
            time: value === '-' ? null : normalizeTime(value),
          })),
      };
    })
    .filter(Boolean);
}

function splitIntoSections(parsedRows) {
  if (!parsedRows.length) {
    return [];
  }

  const firstStopName = parsedRows[0].stopName;
  const sections = [];
  let currentSection = [];

  for (const row of parsedRows) {
    if (row.stopName === firstStopName && currentSection.length > 0) {
      sections.push(currentSection);
      currentSection = [];
    }

    currentSection.push(row);
  }

  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

function buildColumnAnchors(sectionRows) {
  const anchors = [];

  const xs = sectionRows
    .flatMap((row) => row.cells.map((cell) => cell.x))
    .sort((left, right) => left - right);

  for (const x of xs) {
    const anchor = anchors.find((candidate) => Math.abs(candidate - x) <= COLUMN_TOLERANCE);

    if (anchor !== undefined) {
      const index = anchors.indexOf(anchor);
      anchors[index] = Number(((anchor + x) / 2).toFixed(2));
      continue;
    }

    anchors.push(x);
  }

  return anchors;
}

function alignRowTimes(row, columnAnchors) {
  const times = Array.from({ length: columnAnchors.length }, () => null);

  for (const cell of row.cells) {
    let bestIndex = -1;
    let bestDistance = Infinity;

    for (let index = 0; index < columnAnchors.length; index += 1) {
      const distance = Math.abs(columnAnchors[index] - cell.x);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    if (bestIndex !== -1 && bestDistance <= COLUMN_TOLERANCE) {
      times[bestIndex] = cell.time;
    }
  }

  return {
    stopName: row.stopName,
    times,
  };
}

function buildTripsFromRows(parsedRows, { pageNumber, lineId, direction, dayType }) {
  if ('times' in parsedRows[0]) {
    const tripCount = parsedRows.reduce((max, row) => Math.max(max, row.times.length), 0);

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
    })).filter((trip) => trip.stops.length > 1);
  }

  const columnAnchors = buildColumnAnchors(parsedRows);
  const alignedRows = parsedRows.map((row) => alignRowTimes(row, columnAnchors));
  const tripCount = columnAnchors.length;

  return Array.from({ length: tripCount }, (_, tripIndex) => ({
    lineId,
    direction,
    dayType,
    sourcePage: pageNumber,
    stops: alignedRows
      .map((row) => ({
        name: row.stopName,
        time: row.times[tripIndex],
      }))
      .filter((stop) => stop.time),
  })).filter((trip) => trip.stops.length > 1);
}

export function parseTimetablePage({ pageNumber, lineId, direction, dayType, pageText, pageItems }) {
  const rows = pageItems?.length ? parseItemRows(pageItems) : parseTextRows(pageText);

  const parsedRows = rows.map((row) => {
    if (typeof row !== 'string') {
      return row;
    }

    const times = row.match(TIME_RE) ?? [];
    const stopName = row.replace(TIME_RE, '').replace(/\s+/g, ' ').trim();

    return {
      stopName: normalizeStopLabel(stopName),
      times: times.map(normalizeTime),
    };
  });

  return splitIntoSections(parsedRows).flatMap((sectionRows) =>
    buildTripsFromRows(sectionRows, { pageNumber, lineId, direction, dayType }),
  );
}

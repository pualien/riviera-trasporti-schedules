const ROW_TOLERANCE = 0.75;
const COLUMN_SPLIT_X = 420;

function normalizeDirection(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeServiceNote(value = '') {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
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

function splitRowColumns(pageItems) {
  return groupItemsIntoRows(pageItems)
    .map((rowItems) => ({
      left: rowItems.filter((item) => item.x < COLUMN_SPLIT_X).map((item) => item.str).join(' ').trim(),
      right: rowItems.filter((item) => item.x >= COLUMN_SPLIT_X).map((item) => item.str).join(' ').trim(),
    }))
    .filter((row) => row.left || row.right)
    .filter((row) => row.left !== 'INDICE DELLE LINEE' && !row.left.startsWith('RIVIERA TRASPORTI'));
}

function parseIndexLine(rawLine, currentLineId) {
  const line = rawLine.replace(/\s+/g, ' ').trim();

  if (
    !line ||
    line.startsWith('Pagina ') ||
    line.startsWith('INDICE DELLE LINEE') ||
    line.startsWith('( NATALE') ||
    line.toLowerCase().startsWith('con diramazioni per')
  ) {
    return { nextLineId: currentLineId, entry: null };
  }

  const navettaMatch = line.match(/^(NAVETTE SCOLASTICHE)\s+(.+?)\s+(?:Pagina|" ")\s+(\d+)$/i);
  if (navettaMatch) {
    const [, lineId, rawDescriptor, pageNumber] = navettaMatch;

    return {
      nextLineId: lineId.trim(),
      entry: {
        lineId: lineId.trim(),
        direction: normalizeDirection(rawDescriptor),
        serviceNote: 'scolastico',
        pageNumber: Number(pageNumber),
      },
    };
  }

  const explicitMatch = line.match(/^LINEA\s+([A-Z0-9 /]+(?:\s+Bis)?)\s*:\s*(.+?)(?:\s+(?:Pagina|" ")\s+(\d+))?$/i);
  if (explicitMatch) {
    const [, lineId, rawDescriptor, pageNumber] = explicitMatch;
    const descriptorMatch = rawDescriptor.match(/^(.*?)(?:\(([^)]+)\))?$/);

    return {
      nextLineId: lineId.trim(),
      entry: pageNumber
        ? {
          lineId: lineId.trim(),
          direction: normalizeDirection(descriptorMatch?.[1] ?? rawDescriptor),
          serviceNote: normalizeServiceNote(descriptorMatch?.[2]),
          pageNumber: Number(pageNumber),
        }
        : null,
    };
  }

  const variantMatch = line.match(/^([0-9A-Z /]+(?:FS|P| Bis)?)\s*:\s*(.+?)\s+(?:Pagina|" ")\s+(\d+)$/i);
  if (variantMatch) {
    const [, lineId, rawDescriptor, pageNumber] = variantMatch;
    const descriptorMatch = rawDescriptor.match(/^(.*?)(?:\(([^)]+)\))?$/);

    return {
      nextLineId: lineId.trim(),
      entry: {
        lineId: lineId.trim(),
        direction: normalizeDirection(descriptorMatch?.[1] ?? rawDescriptor),
        serviceNote: normalizeServiceNote(descriptorMatch?.[2]),
        pageNumber: Number(pageNumber),
      },
    };
  }

  const continuedMatch = line.match(/^(.+?)\s+(?:Pagina|" ")\s+(\d+)$/);
  if (continuedMatch && currentLineId) {
    const [, rawDescriptor, pageNumber] = continuedMatch;
    const descriptorMatch = rawDescriptor.match(/^(.*?)(?:\(([^)]+)\))?$/);

    return {
      nextLineId: currentLineId,
      entry: {
        lineId: currentLineId,
        direction: normalizeDirection(descriptorMatch?.[1] ?? rawDescriptor),
        serviceNote: normalizeServiceNote(descriptorMatch?.[2]),
        pageNumber: Number(pageNumber),
      },
    };
  }

  return { nextLineId: currentLineId, entry: null };
}

export function parsePdfIndex(input) {
  if (typeof input === 'string' || input?.pageText) {
    const lines = typeof input === 'string' ? input.split('\n') : input.pageText.split('\n');
    let currentLineId = null;
    const entries = [];

    for (const rawLine of lines) {
      if (!rawLine.trim()) {
        continue;
      }

      const { nextLineId, entry } = parseIndexLine(rawLine, currentLineId);
      currentLineId = nextLineId;

      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  const rows = input?.pageItems?.length ? splitRowColumns(input.pageItems) : [];
  const currentLineIds = {
    left: null,
    right: null,
  };
  const entries = [];

  for (const row of rows) {
    for (const side of ['left', 'right']) {
      const rawLine = row[side];

      if (!rawLine) {
        continue;
      }

      const { nextLineId, entry } = parseIndexLine(rawLine, currentLineIds[side]);
      currentLineIds[side] = nextLineId;

      if (entry) {
        entries.push(entry);
      }
    }
  }

  return entries;
}

export function diffIndexAgainstManifest(indexEntries, manifestEntries) {
  const covered = new Set(
    manifestEntries.map((entry) => `${entry.lineId}|${entry.pageNumber}|${entry.direction}`),
  );

  return indexEntries.filter(
    (entry) => !covered.has(`${entry.lineId}|${entry.pageNumber}|${entry.direction}`),
  );
}

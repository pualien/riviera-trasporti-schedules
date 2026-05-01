function normalizeDirection(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeServiceNote(value = '') {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseIndexLine(rawLine, currentLineId) {
  const line = rawLine.replace(/\s+/g, ' ').trim();

  const explicitMatch = line.match(/^LINEA\s+([A-Z0-9 /]+)\s*:\s*(.+?)\s+" "\s+(\d+)$/i);
  if (explicitMatch) {
    const [, lineId, rawDescriptor, pageNumber] = explicitMatch;
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

  const variantMatch = line.match(/^([0-9A-Z /]+)\s*:\s*(.+?)\s+" "\s+(\d+)$/i);
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

  const continuedMatch = line.match(/^(.+?)\s+" "\s+(\d+)$/);
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

export function parsePdfIndex(pageText) {
  let currentLineId = null;
  const entries = [];

  for (const rawLine of pageText.split('\n')) {
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

export function diffIndexAgainstManifest(indexEntries, manifestEntries) {
  const covered = new Set(
    manifestEntries.map((entry) => `${entry.lineId}|${entry.pageNumber}|${entry.direction}`),
  );

  return indexEntries.filter(
    (entry) => !covered.has(`${entry.lineId}|${entry.pageNumber}|${entry.direction}`),
  );
}

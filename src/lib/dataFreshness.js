function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, locale) {
  const date = parseDate(value);
  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function sourceType(metadata) {
  return metadata?.source?.type ?? (metadata?.source?.effectiveDate ? 'pdf' : 'unknown');
}

function qualityStatus(metadata, quality) {
  return quality?.status ?? metadata?.quality?.status ?? 'fresh';
}

export function buildDataFreshnessViewModel({ metadata = null, quality = null, locale = 'en' } = {}) {
  if (!metadata?.source) {
    return { visible: false };
  }

  const type = sourceType(metadata);
  const status = qualityStatus(metadata, quality);
  const validUntil = metadata.source.validUntil;
  const validFrom = metadata.source.validFrom ?? metadata.source.effectiveDate;
  const chipText = type === 'gtfs' && validUntil
    ? `Structured regional timetable · valid until ${formatDate(validUntil, locale)}`
    : `Official PDF timetable · valid from ${formatDate(validFrom, locale)}`;

  return {
    visible: true,
    status,
    sourceType: type,
    chipText,
    builtLabel: metadata.builtAt ? `Last built ${formatDate(metadata.builtAt, locale)}` : '',
    validFromLabel: validFrom ? formatDate(validFrom, locale) : '',
    validUntilLabel: validUntil ? formatDate(validUntil, locale) : '',
    sourceTitle: metadata.source.title ?? '',
    sourceUrl: metadata.source.url ?? '',
    referencePdf: metadata.source.referencePdf ?? null,
    warningVisible: status === 'warning' || status === 'stale',
    warningText: 'The timetable feed is near its validity limit. Check the linked official source before travelling.',
  };
}

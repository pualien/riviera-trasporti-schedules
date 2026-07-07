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

  if (String(locale).toLowerCase().startsWith('it')) {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
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

function isItalianLocale(locale) {
  return String(locale).toLowerCase().startsWith('it');
}

export function buildDataFreshnessViewModel({ metadata = null, quality = null, locale = 'en' } = {}) {
  if (!metadata?.source) {
    return { visible: false };
  }

  const type = sourceType(metadata);
  const status = qualityStatus(metadata, quality);
  const validUntil = metadata.source.validUntil;
  const validFrom = metadata.source.validFrom ?? metadata.source.effectiveDate;
  const italian = isItalianLocale(locale);
  const chipText = type === 'gtfs' && validUntil
    ? (italian
      ? `Dati GTFS Regione Liguria, validi fino al ${formatDate(validUntil, locale)}`
      : `Structured regional timetable · valid until ${formatDate(validUntil, locale)}`)
    : (italian
      ? `Orario ufficiale PDF · valido dal ${formatDate(validFrom, locale)}`
      : `Official PDF timetable · valid from ${formatDate(validFrom, locale)}`);

  return {
    visible: true,
    status,
    sourceType: type,
    chipText,
    builtLabel: metadata.builtAt
      ? `${italian ? 'Ultima build' : 'Last built'} ${formatDate(metadata.builtAt, locale)}`
      : '',
    validFromLabel: validFrom ? formatDate(validFrom, locale) : '',
    validUntilLabel: validUntil ? formatDate(validUntil, locale) : '',
    sourceTitle: metadata.source.title ?? '',
    sourceUrl: metadata.source.url ?? '',
    referencePdf: metadata.source.referencePdf ?? null,
    warningVisible: status === 'warning' || status === 'stale',
    warningText: italian
      ? 'Il feed orari è vicino al limite di validità. Controlla la fonte ufficiale prima di viaggiare.'
      : 'The timetable feed is near its validity limit. Check the linked official source before travelling.',
  };
}

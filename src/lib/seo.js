const DEFAULT_TITLE = 'Riviera Trasporti Ricerca Percorsi';
const DEFAULT_DESCRIPTION = 'Search direct Riviera Trasporti bus timetables faster than scanning the official Riviera Trasporti PDF across Imperia, Sanremo, Ventimiglia, Andora, and nearby Riviera destinations.';

export function buildDefaultSeoMetadata() {
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  };
}

export function buildRouteSeoMetadata({ from, to, dayTypeLabel }) {
  return {
    title: `${from} to ${to} | ${DEFAULT_TITLE}`,
    description: `Direct Riviera Trasporti timetable lookup for ${from} to ${to} on ${dayTypeLabel}. Compare next departures, full schedules, and taxi fallback options from the official PDF dataset.`,
  };
}

export function applySeoMetadata(doc, { title, description }) {
  doc.title = title;

  const descriptionMeta = doc.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    descriptionMeta.setAttribute('content', description);
  }

  const titleSelectors = [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
  ];

  for (const selector of titleSelectors) {
    const element = doc.querySelector(selector);
    if (element) {
      element.setAttribute('content', title);
    }
  }

  const descriptionSelectors = [
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
  ];

  for (const selector of descriptionSelectors) {
    const element = doc.querySelector(selector);
    if (element) {
      element.setAttribute('content', description);
    }
  }
}

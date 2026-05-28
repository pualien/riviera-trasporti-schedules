import { BRAND_NAME, OFFICIAL_SOURCE_NAME } from './brand.js';

const DEFAULT_TITLE = BRAND_NAME;
const DEFAULT_DESCRIPTION = `${BRAND_NAME} helps you check direct ${OFFICIAL_SOURCE_NAME} buses from the official PDF across the Riviera dei Fiori, including Imperia, Sanremo, Ventimiglia, Andora, and nearby towns.`;

export function buildDefaultSeoMetadata() {
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  };
}

export function buildRouteSeoMetadata({ from, to, dayTypeLabel }) {
  return {
    title: `${from} to ${to} | ${DEFAULT_TITLE}`,
    description: `${BRAND_NAME} helps you compare direct ${OFFICIAL_SOURCE_NAME} departures for ${from} to ${to} on ${dayTypeLabel}, with official-PDF trust and fallback context.`,
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

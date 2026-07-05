import { parseSharedTimetable } from './shared.mjs';

const HEADING_RE = /^LINEA\s+(.+?)\s*:\s*(.+)$/i;
const SECTION_BOUNDARY_TOLERANCE = 0.75;

function normalizeHeading(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function sectionHeadings(pageItems = []) {
  return pageItems
    .map((item) => ({
      ...item,
      text: normalizeHeading(item.str ?? ''),
    }))
    .filter((item) => HEADING_RE.test(item.text))
    .sort((left, right) => right.y - left.y);
}

function sectionItems(pageItems, currentHeading, nextHeading) {
  return pageItems.filter((item) => (
    item.y < currentHeading.y - SECTION_BOUNDARY_TOLERANCE
    && (!nextHeading || item.y > nextHeading.y + SECTION_BOUNDARY_TOLERANCE)
  ));
}

export function parseUrbanSections(config) {
  const headings = sectionHeadings(config.pageItems);

  if (!headings.length) {
    throw new Error(`Missing urban section headings for ${config.lineId} page ${config.pageNumber}`);
  }

  return headings.flatMap((heading, index) =>
    parseSharedTimetable(
      {
        ...config,
        pageItems: sectionItems(config.pageItems, heading, headings[index + 1]),
        pageText: '',
      },
      {
        repeatFirstStopStartsNewSection: false,
      },
    ));
}

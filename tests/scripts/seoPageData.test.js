import { describe, expect, it } from 'vitest';
import {
  buildLinePageSummaries,
  buildPlacePageSummaries,
  buildRoutePageCandidates,
  slugifySegment,
} from '../../scripts/lib/seoPageData.mjs';

const stops = [
  { id: 'imperia', canonical: 'Imperia' },
  { id: 'sanremo', canonical: 'Sanremo Autostazione' },
  { id: 'ventimiglia', canonical: 'Ventimiglia' },
];

const localities = [
  { id: 'imperia', label: 'Imperia', stopIds: ['imperia'] },
  { id: 'sanremo', label: 'Sanremo', stopIds: ['sanremo'] },
  { id: 'ventimiglia', label: 'Ventimiglia', stopIds: ['ventimiglia'] },
];

const trips = [
  {
    lineId: '12',
    direction: 'Imperia - Sanremo',
    dayType: 'feriale',
    sourcePage: 23,
    stops: [
      { stopId: 'imperia', name: 'Imperia', time: '08:00' },
      { stopId: 'sanremo', name: 'Sanremo', time: '08:45' },
    ],
  },
  {
    lineId: '1',
    direction: 'Sanremo - Ventimiglia',
    dayType: 'feriale',
    sourcePage: 3,
    stops: [
      { stopId: 'sanremo', name: 'Sanremo', time: '09:00' },
      { stopId: 'ventimiglia', name: 'Ventimiglia', time: '09:55' },
    ],
  },
];

describe('seoPageData', () => {
  it('creates stable lowercase ASCII slugs', () => {
    expect(slugifySegment('Sanremo Autostazione')).toBe('sanremo-autostazione');
    expect(slugifySegment('Ventimiglia - Via Cavour')).toBe('ventimiglia-via-cavour');
  });

  it('builds direct route page candidates with real trips only', () => {
    const candidates = buildRoutePageCandidates({ trips, localities, limit: 10 });

    expect(candidates.map((candidate) => candidate.slug)).toContain('imperia/sanremo');
    expect(candidates.find((candidate) => candidate.slug === 'imperia/ventimiglia')).toBeUndefined();
    expect(candidates[0]).toMatchObject({
      fromLocalityId: 'imperia',
      toLocalityId: 'sanremo',
      lineIds: ['12'],
      dayTypes: ['feriale'],
    });
  });

  it('builds place summaries with direct destinations', () => {
    const summaries = buildPlacePageSummaries({ trips, localities });

    expect(summaries.find((place) => place.localityId === 'imperia')).toMatchObject({
      slug: 'imperia',
      label: 'Imperia',
      directDestinations: [{ id: 'sanremo', label: 'Sanremo', slug: 'sanremo' }],
    });
  });

  it('builds line page summaries', () => {
    const summaries = buildLinePageSummaries({ trips, stops });

    expect(summaries.find((line) => line.lineId === '12')).toMatchObject({
      slug: '12',
      lineId: '12',
      directions: ['Imperia - Sanremo'],
    });
  });
});

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

  it('ranks route candidates by raw departure count before slicing display rows', () => {
    const rankingLocalities = [
      { id: 'origin', label: 'Origin', stopIds: ['origin'] },
      { id: 'aaron', label: 'Aaron', stopIds: ['aaron'] },
      { id: 'zeta', label: 'Zeta', stopIds: ['zeta'] },
    ];
    const rankingTrips = [
      ...Array.from({ length: 12 }, (_, index) => ({
        lineId: '1',
        direction: 'Origin - Aaron',
        dayType: 'feriale',
        sourcePage: 1,
        stops: [
          { stopId: 'origin', name: 'Origin', time: `07:${String(index).padStart(2, '0')}` },
          { stopId: 'aaron', name: 'Aaron', time: `08:${String(index).padStart(2, '0')}` },
        ],
      })),
      ...Array.from({ length: 13 }, (_, index) => ({
        lineId: '2',
        direction: 'Origin - Zeta',
        dayType: 'feriale',
        sourcePage: 2,
        stops: [
          { stopId: 'origin', name: 'Origin', time: `09:${String(index).padStart(2, '0')}` },
          { stopId: 'zeta', name: 'Zeta', time: `10:${String(index).padStart(2, '0')}` },
        ],
      })),
    ];

    const [firstCandidate] = buildRoutePageCandidates({
      trips: rankingTrips,
      localities: rankingLocalities,
      limit: 10,
    });

    expect(firstCandidate).toMatchObject({
      slug: 'origin/zeta',
      departureCount: 13,
    });
    expect(firstCandidate.departures).toHaveLength(12);
  });

  it('deduplicates broad locality stop pairs to one representative segment per trip', () => {
    const broadLocalities = [
      { id: 'imperia', label: 'Imperia', stopIds: ['imperia-porto', 'imperia-oneglia'] },
      { id: 'sanremo', label: 'Sanremo', stopIds: ['sanremo-foce', 'sanremo-autostazione'] },
    ];
    const broadTrips = [
      {
        lineId: '12',
        direction: 'Imperia - Sanremo',
        dayType: 'feriale',
        sourcePage: 23,
        stops: [
          { stopId: 'imperia-porto', name: 'Imperia Porto', time: '08:00' },
          { stopId: 'imperia-oneglia', name: 'Imperia Oneglia', time: '08:10' },
          { stopId: 'sanremo-foce', name: 'Sanremo Foce', time: '08:45' },
          { stopId: 'sanremo-autostazione', name: 'Sanremo Autostazione', time: '08:55' },
        ],
      },
    ];

    const [candidate] = buildRoutePageCandidates({ trips: broadTrips, localities: broadLocalities });

    expect(candidate).toMatchObject({
      fromLocalityId: 'imperia',
      toLocalityId: 'sanremo',
      departureCount: 1,
      departures: [
        expect.objectContaining({
          departureTime: '08:00',
          arrivalTime: '08:45',
        }),
      ],
    });
  });

  it('excludes route departure rows whose arrival time is earlier than departure time', () => {
    const reverseTimeTrips = [
      {
        lineId: '17',
        direction: 'Taggia - Sanremo',
        dayType: 'feriale',
        sourcePage: 17,
        stops: [
          { stopId: 'taggia', name: 'Taggia', time: '06:25' },
          { stopId: 'sanremo', name: 'Sanremo', time: '06:15' },
        ],
      },
      {
        lineId: '17',
        direction: 'Taggia - Sanremo',
        dayType: 'feriale',
        sourcePage: 17,
        stops: [
          { stopId: 'taggia', name: 'Taggia', time: '06:30' },
          { stopId: 'sanremo', name: 'Sanremo', time: '06:45' },
        ],
      },
    ];
    const reverseTimeLocalities = [
      { id: 'taggia', label: 'Taggia', stopIds: ['taggia'] },
      { id: 'sanremo', label: 'Sanremo', stopIds: ['sanremo'] },
    ];

    const [candidate] = buildRoutePageCandidates({
      trips: reverseTimeTrips,
      localities: reverseTimeLocalities,
    });

    expect(candidate).toMatchObject({
      slug: 'taggia/sanremo',
      departureCount: 1,
      departures: [
        expect.objectContaining({
          departureTime: '06:30',
          arrivalTime: '06:45',
        }),
      ],
    });
  });

  it('keeps route slugs non-empty and unique when locality labels collide', () => {
    const collisionLocalities = [
      { id: 'origin', label: '!!!', stopIds: ['origin'] },
      { id: 'sanremo-a', label: 'San Remo', stopIds: ['sanremo-a'] },
      { id: 'sanremo-b', label: 'San-Remo', stopIds: ['sanremo-b'] },
    ];
    const collisionTrips = [
      {
        lineId: '1',
        direction: 'Origin - San Remo',
        dayType: 'feriale',
        stops: [
          { stopId: 'origin', name: 'Origin', time: '08:00' },
          { stopId: 'sanremo-a', name: 'San Remo', time: '08:30' },
        ],
      },
      {
        lineId: '2',
        direction: 'Origin - San-Remo',
        dayType: 'feriale',
        stops: [
          { stopId: 'origin', name: 'Origin', time: '09:00' },
          { stopId: 'sanremo-b', name: 'San-Remo', time: '09:30' },
        ],
      },
    ];

    const slugs = buildRoutePageCandidates({ trips: collisionTrips, localities: collisionLocalities }).map(
      (candidate) => candidate.slug,
    );

    expect(slugs).toEqual(['origin/san-remo', 'origin/sanremo-b']);
  });

  it('builds place summaries with direct destinations', () => {
    const summaries = buildPlacePageSummaries({ trips, localities });

    expect(summaries.find((place) => place.localityId === 'imperia')).toMatchObject({
      slug: 'imperia',
      label: 'Imperia',
      directDestinations: [{ id: 'sanremo', label: 'Sanremo', slug: 'sanremo' }],
    });
  });

  it('keeps place slugs and direct destination slugs non-empty and unique', () => {
    const collisionLocalities = [
      { id: 'punctuation', label: '!!!', stopIds: ['punctuation'] },
      { id: 'sanremo-a', label: 'San Remo', stopIds: ['sanremo-a'] },
      { id: 'sanremo-b', label: 'San-Remo', stopIds: ['sanremo-b'] },
    ];
    const collisionTrips = [
      {
        lineId: '1',
        direction: 'Punctuation - San Remo',
        dayType: 'feriale',
        stops: [
          { stopId: 'punctuation', name: 'Punctuation', time: '08:00' },
          { stopId: 'sanremo-a', name: 'San Remo', time: '08:30' },
          { stopId: 'sanremo-b', name: 'San-Remo', time: '08:40' },
        ],
      },
    ];

    const summaries = buildPlacePageSummaries({ trips: collisionTrips, localities: collisionLocalities });
    const placeSlugs = summaries.map((summary) => summary.slug);
    const punctuation = summaries.find((summary) => summary.localityId === 'punctuation');

    expect(placeSlugs).toEqual(['punctuation', 'san-remo', 'sanremo-b']);
    expect(punctuation.directDestinations).toEqual([
      { id: 'sanremo-a', label: 'San Remo', slug: 'san-remo' },
      { id: 'sanremo-b', label: 'San-Remo', slug: 'sanremo-b' },
    ]);
  });

  it('builds line page summaries', () => {
    const summaries = buildLinePageSummaries({ trips, stops });

    expect(summaries.find((line) => line.lineId === '12')).toMatchObject({
      slug: '12',
      lineId: '12',
      directions: ['Imperia - Sanremo'],
    });
  });

  it('adds representative forward departures to line page summaries', () => {
    const lineTrips = [
      {
        lineId: '12',
        direction: 'Imperia - Sanremo',
        dayType: 'festivo',
        sourcePage: 24,
        stops: [
          { stopId: 'imperia', name: 'Imperia', time: '10:00' },
          { stopId: 'sanremo', name: 'Sanremo', time: '10:45' },
        ],
      },
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
        lineId: '12',
        direction: 'Sanremo - Imperia',
        dayType: 'feriale',
        sourcePage: 23,
        stops: [
          { stopId: 'sanremo', name: 'Sanremo', time: '22:30' },
          { stopId: 'imperia', name: 'Imperia', time: '22:10' },
        ],
      },
    ];

    const [summary] = buildLinePageSummaries({ trips: lineTrips, stops });

    expect(summary.departures).toEqual([
      {
        dayType: 'feriale',
        direction: 'Imperia - Sanremo',
        departureTime: '08:00',
        arrivalTime: '08:45',
        fromLabel: 'Imperia',
        toLabel: 'Sanremo Autostazione',
        sourcePage: 23,
      },
      {
        dayType: 'festivo',
        direction: 'Imperia - Sanremo',
        departureTime: '10:00',
        arrivalTime: '10:45',
        fromLabel: 'Imperia',
        toLabel: 'Sanremo Autostazione',
        sourcePage: 24,
      },
    ]);
  });

  it('keeps line slugs non-empty and unique when line ids collide after slugging', () => {
    const lineTrips = [
      {
        lineId: 'San Remo',
        direction: 'A - B',
        dayType: 'feriale',
        stops: [],
      },
      {
        lineId: 'San-Remo',
        direction: 'C - D',
        dayType: 'feriale',
        stops: [],
      },
      {
        lineId: '!!!',
        direction: 'E - F',
        dayType: 'feriale',
        stops: [],
      },
    ];

    expect(buildLinePageSummaries({ trips: lineTrips }).map((line) => line.slug)).toEqual([
      'line',
      'san-remo',
      'san-remo-2',
    ]);
  });
});

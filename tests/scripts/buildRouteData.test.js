import { describe, expect, it } from 'vitest';
import { buildRouteData } from '../../scripts/build-route-data.mjs';

describe('buildRouteData', () => {
  it('fails when the manifest misses an indexed page', async () => {
    await expect(
      buildRouteData({
        indexEntries: [{ lineId: '12', pageNumber: 23, direction: 'ANDORA - IMPERIA - SANREMO' }],
        manifestEntries: [],
        pages: [],
        aliases: {},
      }),
    ).rejects.toThrow('Missing indexed timetable pages');
  });

  it('builds line, stop, and trip assets with stable ids', async () => {
    const output = await buildRouteData({
      indexEntries: [{ lineId: '12', pageNumber: 23, direction: 'ANDORA - IMPERIA - SANREMO' }],
      manifestEntries: [
        {
          lineId: '12',
          pageNumber: 23,
          direction: 'ANDORA - IMPERIA - SANREMO',
          dayType: 'feriale',
          parserFamily: 'linear-intercity',
        },
      ],
      pages: [
        {
          pageNumber: 23,
          text: `Andora Stazione FS 05.35
Imperia Porto Maurizio 06.20
Sanremo Autostazione 07.00`,
          items: [],
        },
      ],
      aliases: {
        'andora stazione fs': ['stazione andora'],
        'imperia porto maurizio': ['porto maurizio'],
        'sanremo autostazione': ['sanremo'],
      },
      localities: [
        {
          id: 'porto-maurizio',
          label: 'Porto Maurizio',
          aliases: ['Imperia Porto Maurizio'],
          stopIds: ['imperia-porto-maurizio'],
        },
        {
          id: 'sanremo',
          label: 'Sanremo',
          aliases: ['Sanremo Autostazione'],
          stopIds: ['sanremo-autostazione'],
        },
      ],
    });

    expect(output.lines[0]).toMatchObject({ lineId: '12' });
    expect(output.stops[1]).toMatchObject({ id: 'imperia-porto-maurizio' });
    expect(output.trips[0].stops[1]).toMatchObject({ stopId: 'imperia-porto-maurizio' });
    expect(output.localities).toContainEqual(
      expect.objectContaining({ id: 'porto-maurizio', stopIds: ['imperia-porto-maurizio'] }),
    );
    expect(output.reachability['imperia-porto-maurizio']).toEqual(['sanremo-autostazione']);
  });

  it('fails when a locality references an unknown stop id', async () => {
    await expect(
      buildRouteData({
        indexEntries: [{ lineId: '12', pageNumber: 23, direction: 'ANDORA - IMPERIA - SANREMO' }],
        manifestEntries: [
          {
            lineId: '12',
            pageNumber: 23,
            direction: 'ANDORA - IMPERIA - SANREMO',
            dayType: 'feriale',
            parserFamily: 'linear-intercity',
          },
        ],
        pages: [
          {
            pageNumber: 23,
            text: `Andora Stazione FS 05.35
Imperia Porto Maurizio 06.20
Sanremo Autostazione 07.00`,
            items: [],
          },
        ],
        aliases: {},
        localities: [
          { id: 'porto-maurizio', label: 'Porto Maurizio', aliases: [], stopIds: ['missing-stop'] },
        ],
      }),
    ).rejects.toThrow('Unknown locality stop id');
  });

  it('builds metadata with source freshness and indexed coverage counts', async () => {
    const output = await buildRouteData({
      indexEntries: [{ lineId: '12', pageNumber: 23, direction: 'ANDORA - IMPERIA - SANREMO' }],
      manifestEntries: [
        {
          lineId: '12',
          pageNumber: 23,
          direction: 'ANDORA - IMPERIA - SANREMO',
          dayType: 'feriale',
          parserFamily: 'linear-intercity',
        },
      ],
      pages: [
        {
          pageNumber: 23,
          text: `Andora Stazione FS 05.35
Imperia Porto Maurizio 06.20
Sanremo Autostazione 07.00`,
          items: [],
        },
      ],
      aliases: {},
      localities: [],
      builtAt: '2026-05-05T08:30:00.000Z',
    });

    expect(output.metadata).toMatchObject({
      source: {
        title: '2025-2026 Orario Invernale Generale 7ª Ver. dal 01-04-2026',
        url: expect.stringContaining('2025-2026_Orario_Invernale_Generale'),
        effectiveDate: '2026-04-01',
      },
      builtAt: '2026-05-05T08:30:00.000Z',
      coverage: {
        indexedPageCount: 1,
        manifestPageCount: 1,
      },
    });
  });
});

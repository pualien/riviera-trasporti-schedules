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
        title: '2026 Orario Estivo Ver. 1.3ª dal 15-06-2026',
        url: expect.stringContaining('2026_Orario_Estivo_Ver._1.3'),
        effectiveDate: '2026-06-15',
      },
      builtAt: '2026-05-05T08:30:00.000Z',
      coverage: {
        indexedPageCount: 1,
        manifestPageCount: 1,
      },
    });
  });

  it('derives localities from configured locality rules and stop data', async () => {
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
          text: `Diano Marina 05.35
D. Marina Vecchia Stazione 05.40
Sanremo Autostazione 07.00`,
          items: [],
        },
      ],
      aliases: {},
      localities: [],
      localityRules: [
        {
          id: 'diano-marina',
          label: 'Diano Marina',
          aliases: ['Diano'],
          matchTokens: ['diano marina', 'd. marina'],
        },
      ],
    });

    expect(output.localities).toContainEqual(
      expect.objectContaining({
        id: 'diano-marina',
        label: 'Diano Marina',
        aliases: ['Diano'],
        stopIds: ['diano-marina', 'd-marina-vecchia-stazione'],
        matchTokens: ['diano marina', 'diano', 'd marina'],
      }),
    );
  });

  it('matches locality rule tokens at the end of a stop name', async () => {
    const output = await buildRouteData({
      indexEntries: [{ lineId: '34', pageNumber: 34, direction: 'VALLEY LOOP' }],
      manifestEntries: [
        {
          lineId: '34',
          pageNumber: 34,
          direction: 'VALLEY LOOP',
          dayType: 'feriale',
          parserFamily: 'linear-intercity',
        },
      ],
      pages: [
        {
          pageNumber: 34,
          text: `Bivio Gazzelli 08.00
Pontedassio Centro 08.20`,
          items: [],
        },
      ],
      aliases: {},
      localities: [],
      localityRules: [
        {
          id: 'pontedassio',
          label: 'Pontedassio',
          aliases: [],
          matchTokens: ['gazzelli'],
        },
      ],
    });

    expect(output.localities).toContainEqual(
      expect.objectContaining({
        id: 'pontedassio',
        stopIds: expect.arrayContaining(['bivio-gazzelli']),
      }),
    );
  });
});

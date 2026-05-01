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
    });

    expect(output.lines[0]).toMatchObject({ lineId: '12' });
    expect(output.stops[1]).toMatchObject({ id: 'imperia-porto-maurizio' });
    expect(output.trips[0].stops[1]).toMatchObject({ stopId: 'imperia-porto-maurizio' });
  });
});

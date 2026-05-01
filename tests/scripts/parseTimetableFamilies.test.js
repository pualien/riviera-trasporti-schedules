import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseTimetablePage } from '../../scripts/lib/parseTimetablePage.mjs';

function fixture(name) {
  return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');
}

describe('parseTimetablePage families', () => {
  it('parses linear intercity pages', () => {
    const trips = parseTimetablePage({
      parserFamily: 'linear-intercity',
      lineId: '1',
      pageNumber: 3,
      direction: 'VENTIMIGLIA - PONTE SAN LUIGI',
      dayType: 'feriale',
      pageText: fixture('line1-ventimiglia-ponte-san-luigi.txt'),
    });

    expect(trips[0].stops[0]).toEqual({ name: 'ventimiglia via cavour', time: '06:25' });
    expect(trips[0].stops.at(-1)).toEqual({ name: 'ponte san luigi', time: '06:40' });
  });

  it('parses urban branched pages', () => {
    const trips = parseTimetablePage({
      parserFamily: 'urban-branched',
      lineId: '14 / 1',
      pageNumber: 26,
      direction: 'AUTOSTAZIONE - BORGO BARAGALLO',
      dayType: 'feriale',
      pageText: fixture('line14-1-autostazione-borgo-baragallo.txt'),
    });

    expect(trips[0].stops.map((stop) => stop.name)).toContain('autostazione');
    expect(trips[0].stops.map((stop) => stop.name)).toContain('borgo baragallo');
  });

  it('parses circular pages', () => {
    const trips = parseTimetablePage({
      parserFamily: 'circular-or-loop',
      lineId: '14 / 3',
      pageNumber: 27,
      direction: 'AUTOSTAZIONE - FOCE BORGO - CASINO FOCE',
      dayType: 'feriale',
      pageText: fixture('line14-3-circolare.txt'),
    });

    expect(trips[0].stops[0].name).toBe('autostazione');
    expect(trips[0].stops.at(-1).name).toBe('autostazione');
  });

  it('parses school-only pages', () => {
    const trips = parseTimetablePage({
      parserFamily: 'school-or-limited-service',
      lineId: '19',
      pageNumber: 35,
      direction: 'SANREMO - RIVA LIGURE - TERZORIO',
      pageText: fixture('line19-scolastico.txt'),
    });

    expect(trips).toHaveLength(1);
    expect(trips[0].dayType).toBe('scolastico');
  });
});

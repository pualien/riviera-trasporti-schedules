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

  it('parses separate urban sections on a shared page', () => {
    const trips = parseTimetablePage({
      parserFamily: 'urban-sections',
      lineId: '30 / A',
      pageNumber: 53,
      direction: 'SHUTTLE NAVETTA MAREBUS',
      dayType: 'giornaliero',
      pageItems: [
        { str: 'LINEA 30 / A1 : BORGO MARINA - PRINO - BORGO MARINA', x: 100, y: 100 },
        { str: 'Borgo Marina', x: 100, y: 90 },
        { str: '09.00', x: 220, y: 90 },
        { str: 'Prino', x: 100, y: 80 },
        { str: '09.16', x: 220, y: 80 },
        { str: 'Borgo Marina', x: 100, y: 70 },
        { str: '09.20', x: 220, y: 70 },
        { str: 'LINEA 30 / A3 : BORGO MARINA - PARASIO - BORGO MARINA', x: 100, y: 50 },
        { str: 'Borgo Marina', x: 100, y: 40 },
        { str: '10.30', x: 220, y: 40 },
        { str: 'Parasio', x: 100, y: 30 },
        { str: '10.38', x: 220, y: 30 },
        { str: 'Borgo Marina', x: 100, y: 20 },
        { str: '10.45', x: 220, y: 20 },
      ],
    });

    expect(trips).toHaveLength(2);
    expect(trips[0].stops.map((stop) => stop.name)).toEqual(['borgo marina', 'prino', 'borgo marina']);
    expect(trips[1].stops.map((stop) => stop.name)).toEqual(['borgo marina', 'parasio', 'borgo marina']);
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

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseTimetablePage } from '../../scripts/lib/parseTimetablePage.mjs';

const fixture = readFileSync(
  new URL('../fixtures/line12-andora-imperia-sanremo.txt', import.meta.url),
  'utf8',
);

describe('parseTimetablePage', () => {
  it('builds direct trips from a single line page', () => {
    const trips = parseTimetablePage({
      pageNumber: 22,
      lineId: '12',
      direction: 'ANDORA - IMPERIA - SANREMO',
      dayType: 'feriale',
      pageText: fixture,
    });

    expect(trips[0]).toMatchObject({
      lineId: '12',
      dayType: 'feriale',
      sourcePage: 22,
    });

    expect(trips[0].stops[0]).toEqual({ name: 'andora stazione fs', time: '05:35' });
    expect(trips[0].stops.at(-1)).toEqual({ name: 'sanremo autostazione', time: '07:00' });
  });

  it('reconstructs timetable rows from positioned pdf items', () => {
    const pageItems = [
      { str: 'LINEA 12 :', x: 44.66, y: 521.28 },
      { str: 'ANDORA - IMPERIA - SANREMO', x: 185.21, y: 521.28 },
      { str: 'FERIALE', x: 757.68, y: 521.28 },
      { str: 'LV', x: 312.53, y: 501.58 },
      { str: 'SAB', x: 347.23, y: 501.58 },
      { str: 'Andora Stazione FS', x: 47.17, y: 489.94 },
      { str: '05.35', x: 306.89, y: 489.94 },
      { str: '05.55', x: 345.31, y: 489.94 },
      { str: 'Imperia Porto Maurizio', x: 47.17, y: 404.5 },
      { str: '06.20', x: 306.89, y: 404.5 },
      { str: '06.40', x: 345.31, y: 404.5 },
      { str: 'Sanremo Autostazione', x: 47.17, y: 319.06 },
      { str: '07.00', x: 306.89, y: 319.06 },
      { str: '07.20', x: 345.31, y: 319.06 },
    ];

    const trips = parseTimetablePage({
      pageNumber: 23,
      lineId: '12',
      direction: 'ANDORA - IMPERIA - SANREMO',
      dayType: 'feriale',
      pageItems,
    });

    expect(trips).toHaveLength(2);
    expect(trips[0].stops).toEqual([
      { name: 'andora stazione fs', time: '05:35' },
      { name: 'imperia porto maurizio', time: '06:20' },
      { name: 'sanremo autostazione', time: '07:00' },
    ]);
    expect(trips[1].stops).toEqual([
      { name: 'andora stazione fs', time: '05:55' },
      { name: 'imperia porto maurizio', time: '06:40' },
      { name: 'sanremo autostazione', time: '07:20' },
    ]);
  });
});

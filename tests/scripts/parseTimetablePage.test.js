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
});

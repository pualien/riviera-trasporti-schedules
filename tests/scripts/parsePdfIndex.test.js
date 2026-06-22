import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { diffIndexAgainstManifest, parsePdfIndex } from '../../scripts/lib/parsePdfIndex.mjs';

const indexText = readFileSync(
  new URL('../fixtures/pdf-index-page.txt', import.meta.url),
  'utf8',
);

describe('parsePdfIndex', () => {
  it('extracts timetable pages from the published index', () => {
    const entries = parsePdfIndex(indexText);

    expect(entries).toContainEqual({
      lineId: '12',
      direction: 'SANREMO - IMPERIA - ANDORA',
      pageNumber: 22,
      serviceNote: 'feriale',
    });
    expect(entries).toContainEqual({
      lineId: '14 / 3',
      direction: 'AUTOSTAZIONE - FOCE BORGO - CASINO FOCE',
      pageNumber: 27,
      serviceNote: 'circolare',
    });
  });

  it('extracts hyphenated summer line identifiers', () => {
    const entries = parsePdfIndex(
      'LINEA 2-13 : VENTIMIGLIA - BORDIGHERA - SANREMO - TAGGIA (Feriale) Andata pg.1   Pagina   5',
    );

    expect(entries).toEqual([
      {
        lineId: '2-13',
        direction: 'VENTIMIGLIA - BORDIGHERA - SANREMO - TAGGIA (Feriale) Andata pg.1',
        pageNumber: 5,
        serviceNote: '',
      },
    ]);
  });

  it('reports missing index coverage against the manifest', () => {
    const indexEntries = [
      { lineId: '12', pageNumber: 22, direction: 'SANREMO - IMPERIA - ANDORA' },
      { lineId: '12', pageNumber: 23, direction: 'ANDORA - IMPERIA - SANREMO' },
    ];
    const manifest = [{ lineId: '12', pageNumber: 22, direction: 'SANREMO - IMPERIA - ANDORA' }];

    expect(diffIndexAgainstManifest(indexEntries, manifest)).toEqual([
      { lineId: '12', pageNumber: 23, direction: 'ANDORA - IMPERIA - SANREMO' },
    ]);
  });
});

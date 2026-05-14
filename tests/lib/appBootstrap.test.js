import { describe, expect, it } from 'vitest';
import { loadAppBootstrapData } from '../../src/lib/appBootstrap.js';

describe('loadAppBootstrapData', () => {
  it('loads generated metadata and derives the initial day type from the current date', async () => {
    const jsonByUrl = {
      './assets/data/trips.json': [],
      './assets/data/stops.json': [],
      './assets/data/localities.json': [],
      './assets/data/reachability.json': {},
      './assets/data/metadata.json': {
        source: {
          title: '2025-2026 Orario Invernale Generale 7ª Ver. dal 01-04-2026',
          url: 'https://example.com/riviera.pdf',
          effectiveDate: '2026-04-01',
        },
        builtAt: '2026-05-05T08:30:00.000Z',
        coverage: {
          indexedPageCount: 88,
          manifestPageCount: 88,
        },
      },
    };

    const fetchJson = async (url) => jsonByUrl[url];
    const fetchJsonOrNull = async (url) => jsonByUrl[url] ?? null;

    const data = await loadAppBootstrapData({
      fetchJson,
      fetchJsonOrNull,
      now: new Date('2026-05-10T09:00:00'),
    });

    expect(data.metadata.source.url).toBe('https://example.com/riviera.pdf');
    expect(data.formValues.dayType).toBe('festivo');
  });

  it('treats rejected optional JSON requests as absent data', async () => {
    const fetchJson = async (url) => ({
      './assets/data/trips.json': [],
      './assets/data/stops.json': [],
    })[url];
    const fetchJsonOrNull = async () => {
      throw new TypeError('offline');
    };

    const data = await loadAppBootstrapData({
      fetchJson,
      fetchJsonOrNull,
      now: new Date('2026-05-11T09:00:00'),
    });

    expect(data.stopCoordinates).toEqual({});
    expect(data.generatedLocalities).toBeNull();
    expect(data.generatedReachability).toBeNull();
    expect(data.manualLocalities).toBeNull();
    expect(data.metadata).toBeNull();
  });
});

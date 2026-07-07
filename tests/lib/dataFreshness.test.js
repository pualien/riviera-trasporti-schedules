import { describe, expect, it } from 'vitest';
import { buildDataFreshnessViewModel } from '../../src/lib/dataFreshness.js';

describe('buildDataFreshnessViewModel', () => {
  it('formats GTFS source freshness for display', () => {
    const viewModel = buildDataFreshnessViewModel({
      metadata: {
        source: {
          type: 'gtfs',
          title: 'Regione Liguria GTFS planned-service feed',
          url: 'https://example.com/gtfs.zip',
          validFrom: '2026-06-14',
          validUntil: '2026-12-12',
          referencePdf: { title: 'PDF ufficiale', url: 'https://example.com/orario.pdf' },
        },
        builtAt: '2026-07-06T08:00:00.000Z',
        quality: { status: 'fresh', warningCount: 0, errorCount: 0 },
      },
      quality: null,
      locale: 'en',
    });

    expect(viewModel).toMatchObject({
      visible: true,
      status: 'fresh',
      sourceType: 'gtfs',
      chipText: 'Structured regional timetable · valid until Dec 12, 2026',
      builtLabel: 'Last built Jul 6, 2026',
      warningVisible: false,
      sourceUrl: 'https://example.com/gtfs.zip',
    });
  });

  it('formats the Italian GTFS validity banner with the concrete valid-until date', () => {
    const viewModel = buildDataFreshnessViewModel({
      metadata: {
        source: {
          type: 'gtfs',
          title: 'Regione Liguria GTFS planned-service feed',
          url: 'https://example.com/gtfs.zip',
          validFrom: '2026-06-01',
          validUntil: '2026-09-13',
        },
        builtAt: '2026-07-07T16:06:05.593Z',
      },
      locale: 'it',
    });

    expect(viewModel.chipText).toBe('Dati GTFS Regione Liguria, validi fino al 13/09/2026');
    expect(viewModel.builtLabel).toBe('Ultima build 07/07/2026');
    expect(viewModel.warningText).toBe('Il feed orari è vicino al limite di validità. Controlla la fonte ufficiale prima di viaggiare.');
  });

  it('uses data-quality sidecar status when present', () => {
    const viewModel = buildDataFreshnessViewModel({
      metadata: {
        source: { type: 'gtfs', validUntil: '2026-07-20' },
        builtAt: '2026-07-06T08:00:00.000Z',
      },
      quality: {
        status: 'warning',
        warnings: [{ code: 'SOURCE_ENDS_SOON', message: 'GTFS source validity range ends soon.' }],
      },
      locale: 'en',
    });

    expect(viewModel.status).toBe('warning');
    expect(viewModel.warningVisible).toBe(true);
    expect(viewModel.warningText).toBe('The timetable feed is near its validity limit. Check the linked official source before travelling.');
  });

  it('keeps current PDF metadata displayable during migration', () => {
    const viewModel = buildDataFreshnessViewModel({
      metadata: {
        source: { title: 'Orario ufficiale', effectiveDate: '2026-06-15' },
        builtAt: '2026-07-05T23:02:52.036Z',
      },
      quality: null,
      locale: 'en',
    });

    expect(viewModel.sourceType).toBe('pdf');
    expect(viewModel.chipText).toBe('Official PDF timetable · valid from Jun 15, 2026');
  });
});

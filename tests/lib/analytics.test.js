import { describe, expect, it } from 'vitest';
import { pushRouteSearchEvent } from '../../src/lib/analytics.js';

describe('pushRouteSearchEvent', () => {
  it('pushes the search payload with result count and no-result flag', () => {
    const windowObject = {};

    pushRouteSearchEvent(windowObject, {
      from: 'Porto Maurizio',
      to: 'Sanremo',
      dayType: 'feriale',
      resultsCount: 3,
    });

    expect(windowObject.dataLayer).toEqual([
      {
        event: 'route_search',
        from: 'Porto Maurizio',
        to: 'Sanremo',
        day_type: 'feriale',
        results_count: 3,
        no_results: false,
      },
    ]);
  });

  it('marks searches with no matches explicitly', () => {
    const windowObject = { dataLayer: [] };

    pushRouteSearchEvent(windowObject, {
      from: 'Porto Maurizio',
      to: 'Sanremo',
      dayType: 'festivo',
      resultsCount: 0,
    });

    expect(windowObject.dataLayer[0]).toMatchObject({
      event: 'route_search',
      results_count: 0,
      no_results: true,
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUTE_URL_STATE,
  hydrateSearchStateFromRouteSnapshot,
  hydrateSearchStateFromUrl,
  parseRouteUrlState,
  serializeRouteUrlState,
  shouldRunSearchFromRouteState,
} from '../../src/lib/routeUrlState.js';

describe('routeUrlState', () => {
  it('parses search state with ids taking priority over labels', () => {
    const parsed = parseRouteUrlState('?tab=search&from=Porto%20Maurizio&fromLocality=porto-maurizio&fromStop=imperia-porto-maurizio&to=Sanremo&toStop=sanremo-autostazione&day=sabato');

    expect(parsed).toEqual({
      tab: 'search',
      search: {
        fromInput: 'Porto Maurizio',
        fromLocalityId: 'porto-maurizio',
        fromStopId: 'imperia-porto-maurizio',
        toInput: 'Sanremo',
        toStopId: 'sanremo-autostazione',
        dayType: 'sabato',
      },
      browse: {
        mode: 'lines',
        lineId: null,
        stopId: null,
        query: '',
      },
    });
  });

  it('falls back to defaults for unknown tabs, browse modes, and day types', () => {
    expect(parseRouteUrlState('?tab=bad&browse=bad&day=bad')).toEqual(DEFAULT_ROUTE_URL_STATE);
  });

  it('serializes stable route ids and readable labels', () => {
    const params = serializeRouteUrlState({
      tab: 'search',
      search: {
        fromInput: 'Porto Maurizio',
        fromLocalityId: 'porto-maurizio',
        fromStopId: 'imperia-porto-maurizio',
        toInput: 'Sanremo Autostazione',
        toStopId: 'sanremo-autostazione',
        dayType: 'feriale',
      },
      browse: {
        mode: 'stops',
        lineId: null,
        stopId: 'sanremo-autostazione',
        query: 'Sanremo',
      },
    });

    expect(params.toString()).toBe('tab=search&from=Porto+Maurizio&fromLocality=porto-maurizio&fromStop=imperia-porto-maurizio&to=Sanremo+Autostazione&toStop=sanremo-autostazione&day=feriale&browse=stops&stop=sanremo-autostazione&browseQuery=Sanremo');
  });

  it('parses browse filter state for shareable catalog URLs', () => {
    expect(parseRouteUrlState('?tab=browse&browse=stops&browseQuery=sanremo&stop=sanremo-autostazione')).toMatchObject({
      tab: 'browse',
      browse: {
        mode: 'stops',
        lineId: null,
        stopId: 'sanremo-autostazione',
        query: 'sanremo',
      },
    });
  });

  it('preserves the current day type when the URL has no day parameter', () => {
    const hydrated = hydrateSearchStateFromUrl({
      currentFormValues: {
        ...DEFAULT_ROUTE_URL_STATE.search,
        dayType: 'festivo',
      },
      urlSearchState: parseRouteUrlState('?from=Sanremo').search,
      search: '?from=Sanremo',
      stops: [],
      localities: [],
    });

    expect(hydrated).toMatchObject({
      fromInput: 'Sanremo',
      dayType: 'festivo',
    });
  });

  it('uses an explicit valid day parameter from the URL', () => {
    const hydrated = hydrateSearchStateFromUrl({
      currentFormValues: {
        ...DEFAULT_ROUTE_URL_STATE.search,
        dayType: 'festivo',
      },
      urlSearchState: parseRouteUrlState('?from=Sanremo&day=sabato').search,
      search: '?from=Sanremo&day=sabato',
      stops: [],
      localities: [],
    });

    expect(hydrated).toMatchObject({
      fromInput: 'Sanremo',
      dayType: 'sabato',
    });
  });

  it('drops unresolved ids so labels can still hydrate usable search state', () => {
    const hydrated = hydrateSearchStateFromUrl({
      currentFormValues: DEFAULT_ROUTE_URL_STATE.search,
      urlSearchState: parseRouteUrlState('?from=Porto%20Maurizio&fromLocality=stale-locality&fromStop=stale-stop&to=Sanremo&toStop=stale-to-stop&day=feriale').search,
      search: '?from=Porto%20Maurizio&fromLocality=stale-locality&fromStop=stale-stop&to=Sanremo&toStop=stale-to-stop&day=feriale',
      stops: [
        { id: 'imperia-porto-maurizio', canonical: 'Porto Maurizio' },
        { id: 'sanremo-autostazione', canonical: 'Sanremo Autostazione' },
      ],
      localities: [
        { id: 'porto-maurizio', label: 'Porto Maurizio', stopIds: ['imperia-porto-maurizio'] },
      ],
    });

    expect(hydrated).toEqual({
      fromInput: 'Porto Maurizio',
      fromLocalityId: null,
      fromStopId: null,
      toInput: 'Sanremo',
      toStopId: null,
      dayType: 'feriale',
    });
  });

  it('drops unresolved saved route ids while preserving saved labels', () => {
    const hydrated = hydrateSearchStateFromRouteSnapshot({
      currentFormValues: DEFAULT_ROUTE_URL_STATE.search,
      route: {
        fromInput: 'Porto Maurizio',
        fromLocalityId: 'stale-locality',
        fromStopId: 'stale-stop',
        toInput: 'Sanremo',
        toStopId: 'stale-to-stop',
        dayType: 'feriale',
      },
      stops: [
        { id: 'imperia-porto-maurizio', canonical: 'Porto Maurizio' },
        { id: 'sanremo-autostazione', canonical: 'Sanremo Autostazione' },
      ],
      localities: [
        { id: 'porto-maurizio', label: 'Porto Maurizio', stopIds: ['imperia-porto-maurizio'] },
      ],
    });

    expect(hydrated).toEqual({
      fromInput: 'Porto Maurizio',
      fromLocalityId: null,
      fromStopId: null,
      toInput: 'Sanremo',
      toStopId: null,
      dayType: 'feriale',
    });
  });

  it('marks shared search URLs with labels as restorable searches', () => {
    expect(shouldRunSearchFromRouteState({
      tab: 'search',
      search: {
        fromInput: 'Porto Maurizio',
        toInput: 'Sanremo Autostazione',
      },
    })).toBe(true);
  });

  it('does not auto-run browse URLs or incomplete searches', () => {
    expect(shouldRunSearchFromRouteState({
      tab: 'browse',
      search: {
        fromInput: 'Porto Maurizio',
        toInput: 'Sanremo Autostazione',
      },
    })).toBe(false);

    expect(shouldRunSearchFromRouteState({
      tab: 'search',
      search: {
        fromInput: 'Porto Maurizio',
        toInput: '',
      },
    })).toBe(false);
  });
});

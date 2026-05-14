import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUTE_URL_STATE,
  parseRouteUrlState,
  serializeRouteUrlState,
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
      },
    });

    expect(params.toString()).toBe('tab=search&from=Porto+Maurizio&fromLocality=porto-maurizio&fromStop=imperia-porto-maurizio&to=Sanremo+Autostazione&toStop=sanremo-autostazione&day=feriale&browse=stops&stop=sanremo-autostazione');
  });
});

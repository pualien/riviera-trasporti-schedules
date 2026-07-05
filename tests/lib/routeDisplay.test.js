import { describe, expect, it } from 'vitest';
import {
  formatRouteEndpoint,
  formatRouteLabel,
} from '../../src/lib/routeDisplay.js';

const localities = [
  { id: 'sanremo', label: 'Sanremo', stopIds: ['sanremo-autostazione'] },
  { id: 'ventimiglia', label: 'Ventimiglia', stopIds: ['ventimiglia-ponte-andrea-doria'] },
];

const stops = [
  { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
  { id: 'ventimiglia-ponte-andrea-doria', canonical: 'ventimiglia ponte andrea doria' },
];

describe('routeDisplay', () => {
  it('formats locality and exact stop labels for route summaries', () => {
    expect(formatRouteEndpoint({
      input: 'ventimiglia ponte andrea doria',
      stopId: 'ventimiglia-ponte-andrea-doria',
      localities,
      stops,
    })).toBe('Ventimiglia, Ponte Andrea Doria');
  });

  it('keeps broad locality route labels compact and readable', () => {
    expect(formatRouteLabel({
      fromInput: 'Sanremo',
      fromLocalityId: 'sanremo',
      toInput: 'ventimiglia ponte andrea doria',
      toStopId: 'ventimiglia-ponte-andrea-doria',
      localities,
      stops,
    })).toBe('Sanremo to Ventimiglia, Ponte Andrea Doria');
  });
});

import { describe, expect, it } from 'vitest';
import {
  findExactLocalityMatch,
  findExactStopMatch,
  findMatchingLocalities,
  getLocalityStops,
  getReachableStops,
} from '../../src/lib/localities.js';

const localities = [
  {
    id: 'porto-maurizio',
    label: 'Porto Maurizio',
    aliases: ['Imperia Porto Maurizio'],
    matchTokens: ['porto maurizio', 'imperia porto maurizio'],
    stopIds: ['imperia-porto-maurizio', 'imperia-porto-maurizio-piazza-dante'],
  },
];

const stops = [
  { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
  { id: 'imperia-porto-maurizio-piazza-dante', canonical: 'imperia porto maurizio piazza dante' },
  { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
];

describe('locality helpers', () => {
  it('matches localities by broad place name', () => {
    expect(findMatchingLocalities('Porto', localities)[0].id).toBe('porto-maurizio');
  });

  it('expands a locality into exact stop records', () => {
    expect(getLocalityStops('porto-maurizio', localities, stops)).toEqual([
      { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
      { id: 'imperia-porto-maurizio-piazza-dante', canonical: 'imperia porto maurizio piazza dante' },
    ]);
  });

  it('matches a typed locality selection by label or alias', () => {
    expect(findExactLocalityMatch('Porto Maurizio', localities)?.id).toBe('porto-maurizio');
    expect(findExactLocalityMatch('Imperia Porto Maurizio', localities)?.id).toBe('porto-maurizio');
  });

  it('matches a typed exact stop selection by canonical stop label', () => {
    expect(findExactStopMatch('imperia porto maurizio', stops)?.id).toBe('imperia-porto-maurizio');
  });

  it('limits destination stops to the direct reachability map', () => {
    expect(
      getReachableStops('imperia-porto-maurizio', { 'imperia-porto-maurizio': ['sanremo-autostazione'] }, stops),
    ).toEqual([{ id: 'sanremo-autostazione', canonical: 'sanremo autostazione' }]);
  });
});

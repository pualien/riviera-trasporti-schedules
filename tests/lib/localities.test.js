import { describe, expect, it } from 'vitest';
import {
  findExactLocalityMatch,
  findExactStopMatch,
  findMatchingLocalities,
  getDepartureStops,
  getLocalityReachableStops,
  getLocalityStops,
  getReachableStops,
  stopDisplayLabel,
  resolveOriginSelection,
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
  { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', variants: ['porto maurizio'] },
  { id: 'imperia-porto-maurizio-piazza-dante', canonical: 'imperia porto maurizio piazza dante' },
  { id: 'diano-marina', canonical: 'diano marina' },
  { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
  { id: 'taggia-stazione', canonical: 'taggia stazione' },
];

describe('locality helpers', () => {
  it('matches localities by broad place name', () => {
    expect(findMatchingLocalities('Porto', localities)[0].id).toBe('porto-maurizio');
  });

  it('expands a locality into exact stop records', () => {
    expect(getLocalityStops('porto-maurizio', localities, stops)).toEqual([
      { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', variants: ['porto maurizio'] },
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

  it('builds a locality-wide destination union from every stop in the locality', () => {
    expect(
      getLocalityReachableStops(
        'porto-maurizio',
        localities,
        {
          'imperia-porto-maurizio': ['sanremo-autostazione', 'taggia-stazione'],
          'imperia-porto-maurizio-piazza-dante': ['sanremo-autostazione'],
        },
        stops,
      ),
    ).toEqual([
      { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
      { id: 'taggia-stazione', canonical: 'taggia stazione' },
    ]);
  });

  it('lists every stop that has at least one direct onward destination', () => {
    expect(
      getDepartureStops(stops, {
        'imperia-porto-maurizio': ['sanremo-autostazione'],
        'diano-marina': ['taggia-stazione'],
        'sanremo-autostazione': [],
      }),
    ).toEqual([
      { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', variants: ['porto maurizio'] },
      { id: 'diano-marina', canonical: 'diano marina' },
    ]);
  });

  it('formats stop labels with the containing zone', () => {
    expect(stopDisplayLabel(stops[0], localities)).toBe('imperia porto maurizio (Porto Maurizio)');
  });

  it('treats a typed exact stop that also matches a locality alias as an exact origin selection', () => {
    expect(
      resolveOriginSelection({
        fromInput: 'Imperia Porto Maurizio',
        localities,
        stops,
        reachability: {
          'imperia-porto-maurizio': ['sanremo-autostazione'],
          'imperia-porto-maurizio-piazza-dante': ['taggia-stazione'],
        },
      }),
    ).toMatchObject({
      selectedLocality: localities[0],
      exactFromStop: { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
      exactStopChoices: [
        { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', variants: ['porto maurizio'] },
        { id: 'imperia-porto-maurizio-piazza-dante', canonical: 'imperia porto maurizio piazza dante' },
      ],
      reachableDestinations: [
        { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
      ],
    });
  });

  it('treats a typed departure stop outside the locality list as an exact origin selection', () => {
    expect(
      resolveOriginSelection({
        fromInput: 'diano marina',
        localities,
        stops,
        reachability: {
          'diano-marina': ['sanremo-autostazione', 'taggia-stazione'],
        },
      }),
    ).toMatchObject({
      selectedLocality: null,
      exactFromStop: { id: 'diano-marina', canonical: 'diano marina' },
      exactStopChoices: [],
      reachableDestinations: [
        { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
        { id: 'taggia-stazione', canonical: 'taggia stazione' },
      ],
    });
  });
});

import { describe, expect, it } from 'vitest';
import { findTaxiOptionsForRoute } from '../../src/lib/routeTaxiOptions.js';

const stops = [
  { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', variants: ['porto maurizio'] },
  { id: 'sanremo-autostazione', canonical: 'sanremo autostazione', variants: ['sanremo'] },
  { id: 'andora-stazione-fs', canonical: 'andora stazione fs', variants: ['andora'] },
];

describe('findTaxiOptionsForRoute', () => {
  it('returns taxi options for both route endpoints when they map to different provinces', () => {
    const options = findTaxiOptionsForRoute({
      fromInput: 'Porto Maurizio',
      fromStopId: null,
      toInput: 'andora stazione fs',
      toStopId: 'andora-stazione-fs',
      stops,
    });

    expect(options.map((entry) => entry.provinceId)).toEqual(['imperia', 'savona']);
  });

  it('deduplicates province coverage when both route endpoints resolve to the same province', () => {
    const options = findTaxiOptionsForRoute({
      fromInput: 'Porto Maurizio',
      fromStopId: null,
      toInput: 'Sanremo',
      toStopId: null,
      stops,
    });

    expect(options.map((entry) => entry.provinceId)).toEqual(['imperia']);
  });
});

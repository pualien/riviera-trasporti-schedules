import { describe, expect, it } from 'vitest';
import { findTaxiOptionsForRoute } from '../../src/lib/routeTaxiOptions.js';

const stops = [
  { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', variants: ['porto maurizio'] },
  { id: 'diano-marina', canonical: 'diano marina', variants: [] },
  { id: 'sanremo-autostazione', canonical: 'sanremo autostazione', variants: ['sanremo'] },
  { id: 'arma-di-taggia', canonical: 'arma di taggia', variants: [] },
  { id: 'andora-stazione-fs', canonical: 'andora stazione fs', variants: ['andora'] },
];

describe('findTaxiOptionsForRoute', () => {
  it('returns destination-specific taxi options for both route endpoints when available', () => {
    const options = findTaxiOptionsForRoute({
      fromInput: 'Diano Marina',
      fromStopId: 'diano-marina',
      toInput: 'Sanremo',
      toStopId: 'sanremo-autostazione',
      stops,
    });

    expect(options.map((entry) => entry.serviceId)).toEqual([
      'mauro-taxi-diano-marina',
      'radio-taxi-sanremo',
    ]);
  });

  it('keeps province fallback coverage when an endpoint has no destination-specific service', () => {
    const options = findTaxiOptionsForRoute({
      fromInput: 'Porto Maurizio',
      fromStopId: 'imperia-porto-maurizio',
      toInput: 'Andora',
      toStopId: 'andora-stazione-fs',
      stops,
    });

    expect(options.map((entry) => entry.serviceId)).toEqual([
      'taxi-imperia',
      'radio-taxi-albenga',
    ]);
  });

  it('deduplicates taxi services when both route endpoints resolve to the same verified provider', () => {
    const options = findTaxiOptionsForRoute({
      fromInput: 'Sanremo',
      fromStopId: 'sanremo-autostazione',
      toInput: 'Arma di Taggia',
      toStopId: 'arma-di-taggia',
      stops,
    });

    expect(options.map((entry) => entry.serviceId)).toEqual(['radio-taxi-sanremo']);
  });
});

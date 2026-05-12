import { describe, expect, it } from 'vitest';
import { resolveProvinceForStop } from '../../src/lib/provinceLookup.js';

const stops = [
  { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
  { id: 'andora-stazione-fs', canonical: 'andora stazione fs' },
  { id: 'albenga', canonical: 'albenga' },
  { id: 'bastia-/-leca', canonical: 'bastia / leca' },
  { id: 'mystery-stop', canonical: 'mystery stop' },
];

describe('resolveProvinceForStop', () => {
  it('maps current destination stop patterns to Imperia or Savona', () => {
    expect(resolveProvinceForStop('sanremo-autostazione', stops)).toBe('imperia');
    expect(resolveProvinceForStop('andora-stazione-fs', stops)).toBe('savona');
    expect(resolveProvinceForStop('albenga', stops)).toBe('savona');
    expect(resolveProvinceForStop('bastia-/-leca', stops)).toBe('savona');
  });

  it('returns null when the stop cannot be mapped', () => {
    expect(resolveProvinceForStop('mystery-stop', stops)).toBeNull();
    expect(resolveProvinceForStop(null, stops)).toBeNull();
  });
});

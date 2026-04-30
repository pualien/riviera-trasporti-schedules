import { describe, expect, it } from 'vitest';
import { durationBetween, normalizeStopName, toMinutes } from '../../src/lib/time.js';
import { applyStopAliases, canonicalizeStopName } from '../../src/lib/normalize.js';

describe('stop normalization', () => {
  const aliases = {
    'imperia porto maurizio': ['porto maurizio', 'imperia p maurizio'],
    'sanremo autostazione': ['sanremo', 'autostazione sanremo'],
  };

  it('canonicalizes common stop aliases', () => {
    expect(canonicalizeStopName('Imperia P. Maurizio', aliases)).toBe('imperia porto maurizio');
    expect(canonicalizeStopName('Sanremo', aliases)).toBe('sanremo autostazione');
  });

  it('normalizes spacing and punctuation before alias lookup', () => {
    expect(applyStopAliases(' Porto  Maurizio ', aliases)).toBe('imperia porto maurizio');
  });

  it('parses timetable times and durations', () => {
    expect(toMinutes('06:45')).toBe(405);
    expect(durationBetween('16:45', '17:25')).toBe(40);
    expect(normalizeStopName(' Porto  Maurizio ')).toBe('porto maurizio');
  });
});

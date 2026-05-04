import { describe, expect, it } from 'vitest';
import { defaultDayTypeForDate, splitRemainingDepartures } from '../../src/lib/serviceDay.js';

describe('defaultDayTypeForDate', () => {
  it('defaults weekdays to feriale, Saturday to sabato, and Sunday to festivo', () => {
    expect(defaultDayTypeForDate(new Date('2026-05-04T09:00:00'))).toBe('feriale');
    expect(defaultDayTypeForDate(new Date('2026-05-09T09:00:00'))).toBe('sabato');
    expect(defaultDayTypeForDate(new Date('2026-05-10T09:00:00'))).toBe('festivo');
  });
});

describe('splitRemainingDepartures', () => {
  it('marks service as ended when all direct trips have already departed', () => {
    const matches = [
      { departureTime: '06:20', arrivalTime: '07:00' },
      { departureTime: '07:10', arrivalTime: '07:45' },
    ];

    expect(
      splitRemainingDepartures(matches, new Date('2026-05-04T21:00:00')),
    ).toMatchObject({
      remaining: [],
      serviceEnded: true,
    });
  });
});

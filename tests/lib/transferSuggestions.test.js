import { describe, expect, it } from 'vitest';
import { findOneTransferSuggestions } from '../../src/lib/transferSuggestions.js';

const trips = [
  {
    lineId: 'A',
    dayType: 'feriale',
    direction: 'East',
    sourcePage: 10,
    stops: [
      { stopId: 'origin', name: 'Origin', time: '08:00' },
      { stopId: 'transfer', name: 'Transfer', time: '08:20' },
    ],
  },
  {
    lineId: 'B',
    dayType: 'feriale',
    direction: 'South',
    sourcePage: 11,
    stops: [
      { stopId: 'transfer', name: 'Transfer', time: '08:27' },
      { stopId: 'destination', name: 'Destination', time: '09:00' },
    ],
  },
  {
    lineId: 'C',
    dayType: 'feriale',
    direction: 'Too Tight',
    sourcePage: 12,
    stops: [
      { stopId: 'transfer', name: 'Transfer', time: '08:22' },
      { stopId: 'destination', name: 'Destination', time: '08:50' },
    ],
  },
  {
    lineId: 'D',
    dayType: 'sabato',
    direction: 'Wrong Day',
    sourcePage: 13,
    stops: [
      { stopId: 'origin', name: 'Origin', time: '08:05' },
      { stopId: 'transfer', name: 'Transfer', time: '08:25' },
    ],
  },
];

describe('findOneTransferSuggestions', () => {
  it('finds conservative same-day one-transfer suggestions with at least 5 minutes to change', () => {
    const suggestions = findOneTransferSuggestions({
      trips,
      fromStopIds: ['origin'],
      toStopId: 'destination',
      dayType: 'feriale',
      now: new Date('2026-05-14T07:30:00'),
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      transferStopId: 'transfer',
      waitMinutes: 7,
      totalDurationMinutes: 60,
      firstLeg: {
        lineId: 'A',
        departureTime: '08:00',
        arrivalTime: '08:20',
        sourcePage: 10,
      },
      secondLeg: {
        lineId: 'B',
        departureTime: '08:27',
        arrivalTime: '09:00',
        sourcePage: 11,
      },
    });
  });

  it('falls back to earliest full-day options without next language when service has passed', () => {
    const suggestions = findOneTransferSuggestions({
      trips,
      fromStopIds: ['origin'],
      toStopId: 'destination',
      dayType: 'feriale',
      now: new Date('2026-05-14T20:30:00'),
    });

    expect(suggestions[0]).toMatchObject({
      isFuture: false,
      firstLeg: { departureTime: '08:00' },
    });
  });

  it('includes daily service when building weekday transfer suggestions', () => {
    const suggestions = findOneTransferSuggestions({
      trips: [
        {
          lineId: 'A',
          dayType: 'giornaliero',
          sourcePage: 20,
          stops: [
            { stopId: 'origin', name: 'Origin', time: '18:00' },
            { stopId: 'transfer', name: 'Transfer', time: '18:20' },
          ],
        },
        {
          lineId: 'B',
          dayType: 'giornaliero',
          sourcePage: 21,
          stops: [
            { stopId: 'transfer', name: 'Transfer', time: '18:30' },
            { stopId: 'destination', name: 'Destination', time: '19:00' },
          ],
        },
      ],
      fromStopIds: ['origin'],
      toStopId: 'destination',
      dayType: 'feriale',
      now: new Date('2026-05-14T17:30:00'),
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      firstLeg: { departureTime: '18:00' },
      secondLeg: { departureTime: '18:30' },
    });
  });

  it('returns at most 3 suggestions', () => {
    const manyTrips = Array.from({ length: 6 }, (_, index) => ([
      {
        lineId: `A${index}`,
        dayType: 'feriale',
        sourcePage: 20 + index,
        stops: [
          { stopId: 'origin', name: 'Origin', time: `0${index + 6}:00` },
          { stopId: `transfer-${index}`, name: `Transfer ${index}`, time: `0${index + 6}:20` },
        ],
      },
      {
        lineId: `B${index}`,
        dayType: 'feriale',
        sourcePage: 30 + index,
        stops: [
          { stopId: `transfer-${index}`, name: `Transfer ${index}`, time: `0${index + 6}:30` },
          { stopId: 'destination', name: 'Destination', time: `0${index + 6}:50` },
        ],
      },
    ])).flat();

    expect(findOneTransferSuggestions({
      trips: manyTrips,
      fromStopIds: ['origin'],
      toStopId: 'destination',
      dayType: 'feriale',
      now: new Date('2026-05-14T05:00:00'),
    })).toHaveLength(3);
  });

  it('deduplicates duplicated trip rows before limiting suggestions', () => {
    const duplicatedTrips = [
      {
        lineId: '17',
        dayType: 'feriale',
        sourcePage: 40,
        stops: [
          { stopId: 'origin', name: 'Origin', time: '07:10' },
          { stopId: 'transfer', name: 'Transfer', time: '07:30' },
        ],
      },
      {
        lineId: '17',
        dayType: 'feriale',
        sourcePage: 40,
        stops: [
          { stopId: 'origin', name: 'Origin', time: '07:10' },
          { stopId: 'transfer', name: 'Transfer', time: '07:30' },
        ],
      },
      {
        lineId: '15',
        dayType: 'feriale',
        sourcePage: 41,
        stops: [
          { stopId: 'transfer', name: 'Transfer', time: '07:40' },
          { stopId: 'destination', name: 'Destination', time: '08:00' },
        ],
      },
    ];

    const suggestions = findOneTransferSuggestions({
      trips: duplicatedTrips,
      fromStopIds: ['origin'],
      toStopId: 'destination',
      dayType: 'feriale',
      now: new Date('2026-05-14T06:30:00'),
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      transferStopId: 'transfer',
      firstLeg: {
        lineId: '17',
        departureTime: '07:10',
        arrivalTime: '07:30',
        sourcePage: 40,
      },
      secondLeg: {
        lineId: '15',
        departureTime: '07:40',
        arrivalTime: '08:00',
        sourcePage: 41,
      },
    });
  });

  it('rejects transfer legs whose arrival time is earlier than departure time', () => {
    const suggestions = findOneTransferSuggestions({
      trips: [
        {
          lineId: 'A',
          dayType: 'feriale',
          sourcePage: 50,
          stops: [
            { stopId: 'origin', name: 'Origin', time: '08:00' },
            { stopId: 'transfer', name: 'Transfer', time: '08:20' },
          ],
        },
        {
          lineId: 'B',
          dayType: 'feriale',
          sourcePage: 51,
          stops: [
            { stopId: 'transfer', name: 'Transfer', time: '08:30' },
            { stopId: 'destination', name: 'Destination', time: '07:00' },
          ],
        },
      ],
      fromStopIds: ['origin'],
      toStopId: 'destination',
      dayType: 'feriale',
      now: new Date('2026-05-14T07:00:00'),
    });

    expect(suggestions).toEqual([]);
  });
});

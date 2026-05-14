import { describe, expect, it } from 'vitest';
import { buildBrowseIndex } from '../../src/lib/browseIndex.js';

const stops = [
  { id: 'origin', canonical: 'Origin' },
  { id: 'middle', canonical: 'Middle' },
  { id: 'destination', canonical: 'Destination' },
];

const trips = [
  {
    lineId: '12',
    direction: 'Origin to Destination',
    dayType: 'feriale',
    stops: [
      { stopId: 'origin', name: 'Origin', time: '08:00' },
      { stopId: 'middle', name: 'Middle', time: '08:20' },
      { stopId: 'destination', name: 'Destination', time: '09:00' },
    ],
  },
  {
    lineId: '2',
    direction: 'Middle to Destination',
    dayType: 'feriale',
    stops: [
      { stopId: 'middle', name: 'Middle', time: '10:00' },
      { stopId: 'destination', name: 'Destination', time: '10:30' },
    ],
  },
];

describe('buildBrowseIndex', () => {
  it('groups lines with directions and served stops', () => {
    const index = buildBrowseIndex({ trips, stops });

    expect(index.lines).toEqual([
      {
        lineId: '2',
        directions: ['Middle to Destination'],
        stops: [
          { id: 'middle', canonical: 'Middle' },
          { id: 'destination', canonical: 'Destination' },
        ],
      },
      {
        lineId: '12',
        directions: ['Origin to Destination'],
        stops: [
          { id: 'origin', canonical: 'Origin' },
          { id: 'middle', canonical: 'Middle' },
          { id: 'destination', canonical: 'Destination' },
        ],
      },
    ]);
  });

  it('groups stops with serving lines', () => {
    const index = buildBrowseIndex({ trips, stops });

    expect(index.stops.find((stop) => stop.id === 'middle')).toEqual({
      id: 'middle',
      canonical: 'Middle',
      lines: ['2', '12'],
    });
  });
});

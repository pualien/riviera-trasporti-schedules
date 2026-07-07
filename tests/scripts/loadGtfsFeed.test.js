import { describe, expect, it } from 'vitest';
import { loadGtfsFeed } from '../../scripts/lib/gtfs/loadGtfsFeed.mjs';

describe('loadGtfsFeed', () => {
  it('loads required GTFS files from a directory', async () => {
    const feed = await loadGtfsFeed(new URL('../fixtures/gtfs/minimal/', import.meta.url));

    expect(feed.agency[0]).toMatchObject({ agency_id: 'RT', agency_name: 'Riviera Trasporti' });
    expect(feed.routes[0]).toMatchObject({ route_id: 'R12', route_short_name: '12' });
    expect(feed.stops).toHaveLength(3);
    expect(feed.trips[0]).toMatchObject({ trip_id: 'T12_1', service_id: 'WD' });
    expect(feed.stopTimes).toHaveLength(3);
    expect(feed.calendar[0]).toMatchObject({ service_id: 'WD', start_date: '20260614' });
    expect(feed.calendarDates[0]).toMatchObject({ date: '20260815', exception_type: '2' });
  });

  it('throws a clear error when a required GTFS file is missing', async () => {
    await expect(
      loadGtfsFeed(new URL('../fixtures/gtfs/missing/', import.meta.url)),
    ).rejects.toThrow('Missing required GTFS file: agency.txt');
  });
});

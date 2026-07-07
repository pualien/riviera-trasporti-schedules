import { describe, expect, it } from 'vitest';
import { parseGtfsCsv } from '../../scripts/lib/gtfs/parseGtfsCsv.mjs';

describe('parseGtfsCsv', () => {
  it('parses GTFS CSV rows with headers', () => {
    expect(parseGtfsCsv('stop_id,stop_name\nS1,Sanremo Autostazione\nS2,Imperia\n')).toEqual([
      { stop_id: 'S1', stop_name: 'Sanremo Autostazione' },
      { stop_id: 'S2', stop_name: 'Imperia' },
    ]);
  });

  it('handles quoted commas, escaped quotes, and CRLF endings', () => {
    expect(parseGtfsCsv('stop_id,stop_name\r\nS1,"Sanremo, ""Autostazione"""\r\n')).toEqual([
      { stop_id: 'S1', stop_name: 'Sanremo, "Autostazione"' },
    ]);
  });

  it('ignores a UTF-8 BOM and trailing blank lines', () => {
    expect(parseGtfsCsv('\uFEFFroute_id,route_short_name\n12,12\n\n')).toEqual([
      { route_id: '12', route_short_name: '12' },
    ]);
  });

  it('throws when a data row has a different number of fields than the header', () => {
    expect(() => parseGtfsCsv('a,b\n1,2,3\n')).toThrow('CSV row 2 has 3 fields; expected 2');
  });
});

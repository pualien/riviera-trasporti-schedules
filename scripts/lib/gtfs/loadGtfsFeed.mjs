import { readFile } from 'node:fs/promises';
import { parseGtfsCsv } from './parseGtfsCsv.mjs';

const REQUIRED_FILES = Object.freeze({
  agency: 'agency.txt',
  routes: 'routes.txt',
  stops: 'stops.txt',
  trips: 'trips.txt',
  stopTimes: 'stop_times.txt',
});

const OPTIONAL_FILES = Object.freeze({
  calendar: 'calendar.txt',
  calendarDates: 'calendar_dates.txt',
  feedInfo: 'feed_info.txt',
});

async function readGtfsFile(directoryUrl, filename, { required }) {
  try {
    const raw = await readFile(new URL(filename, directoryUrl), 'utf8');
    return parseGtfsCsv(raw);
  } catch (error) {
    if (!required && error?.code === 'ENOENT') {
      return [];
    }

    if (error?.code === 'ENOENT') {
      throw new Error(`Missing required GTFS file: ${filename}`);
    }

    throw error;
  }
}

export async function loadGtfsFeed(directoryUrl) {
  const requiredEntries = [];

  for (const [key, filename] of Object.entries(REQUIRED_FILES)) {
    requiredEntries.push([
      key,
      await readGtfsFile(directoryUrl, filename, { required: true }),
    ]);
  }

  const optionalEntries = await Promise.all(
    Object.entries(OPTIONAL_FILES).map(async ([key, filename]) => [
      key,
      await readGtfsFile(directoryUrl, filename, { required: false }),
    ]),
  );

  return Object.fromEntries([...requiredEntries, ...optionalEntries]);
}

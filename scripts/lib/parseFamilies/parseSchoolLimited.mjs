import { parseSharedTimetable } from './shared.mjs';

export function parseSchoolLimited(config) {
  return parseSharedTimetable(config, {
    repeatFirstStopStartsNewSection: true,
    defaultDayType: config.dayType ?? 'scolastico',
  });
}

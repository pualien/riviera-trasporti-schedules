import { parseSharedTimetable } from './shared.mjs';

export function parseLinearIntercity(config) {
  return parseSharedTimetable(config, {
    repeatFirstStopStartsNewSection: true,
  });
}

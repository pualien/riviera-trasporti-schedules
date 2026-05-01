import { parseSharedTimetable } from './shared.mjs';

export function parseUrbanBranched(config) {
  return parseSharedTimetable(config, {
    repeatFirstStopStartsNewSection: true,
  });
}

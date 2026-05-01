import { parseSharedTimetable } from './shared.mjs';

export function parseCircularLoop(config) {
  return parseSharedTimetable(config, {
    repeatFirstStopStartsNewSection: false,
  });
}

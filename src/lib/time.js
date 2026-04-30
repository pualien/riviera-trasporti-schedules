import { normalizeText } from './normalize.js';

export function normalizeStopName(value) {
  return normalizeText(value);
}

export function toMinutes(timeValue) {
  const [hours, minutes] = timeValue.split(':').map(Number);
  return (hours * 60) + minutes;
}

export function durationBetween(start, end) {
  return toMinutes(end) - toMinutes(start);
}

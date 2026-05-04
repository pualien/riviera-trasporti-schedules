import { toMinutes } from './time.js';

export function defaultDayTypeForDate(now = new Date()) {
  const weekday = now.getDay();

  if (weekday === 0) {
    return 'festivo';
  }

  if (weekday === 6) {
    return 'sabato';
  }

  return 'feriale';
}

export function splitRemainingDepartures(matches, now = new Date()) {
  const nowMinutes = (now.getHours() * 60) + now.getMinutes();
  const remaining = matches.filter((match) => toMinutes(match.departureTime) >= nowMinutes);

  return {
    remaining,
    serviceEnded: matches.length > 0 && remaining.length === 0,
  };
}

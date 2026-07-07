import { toMinutes } from './time.js';

const FIXED_ITALIAN_HOLIDAYS = new Set([
  '01-01',
  '01-06',
  '04-25',
  '05-01',
  '06-02',
  '08-15',
  '11-01',
  '12-08',
  '12-25',
  '12-26',
]);

function localDateParts(date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    weekday: date.getDay(),
  };
}

function monthDayKey({ month, day }) {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function easterSundayParts(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = ((19 * a) + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + (2 * e) + (2 * i) - h - k) % 7;
  const m = Math.floor((a + (11 * h) + (22 * l)) / 451);
  const month = Math.floor((h + l - (7 * m) + 114) / 31);
  const day = ((h + l - (7 * m) + 114) % 31) + 1;

  return { month, day };
}

function isEasterMonday(parts) {
  const easter = easterSundayParts(parts.year);
  const easterMonday = new Date(parts.year, easter.month - 1, easter.day + 1);

  return parts.month === easterMonday.getMonth() + 1
    && parts.day === easterMonday.getDate();
}

function isItalianHoliday(parts) {
  return FIXED_ITALIAN_HOLIDAYS.has(monthDayKey(parts)) || isEasterMonday(parts);
}

function isSchoolWeekday(parts) {
  if (parts.weekday === 0 || parts.weekday === 6) {
    return false;
  }

  const key = monthDayKey(parts);

  return key >= '09-15' || key <= '06-10';
}

export function defaultDayTypeForDate(now = new Date()) {
  const parts = localDateParts(now);

  if (parts.weekday === 0 || isItalianHoliday(parts)) {
    return 'festivo';
  }

  if (parts.weekday === 6) {
    return 'sabato';
  }

  if (isSchoolWeekday(parts)) {
    return 'scolastico';
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

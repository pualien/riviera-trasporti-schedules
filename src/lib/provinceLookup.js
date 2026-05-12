const SAVONA_PATTERNS = [
  /^andora/,
  /^albenga$/,
  /^ortovero$/,
  /^bastia-\/-leca$/,
  /^leca-\/-bastia$/,
];

const IMPERIA_PATTERNS = [
  /^imperia/,
  /^sanremo/,
  /^ventimiglia/,
  /^bordighera/,
  /^taggia/,
  /^arma/,
  /^ospedaletti/,
  /^vallecrosia/,
  /^camporosso/,
  /^dolceacqua/,
];

function matchesAny(stopId, patterns) {
  return patterns.some((pattern) => pattern.test(stopId));
}

export function resolveProvinceForStop(stopId, stops = []) {
  if (!stopId) {
    return null;
  }

  if (matchesAny(stopId, SAVONA_PATTERNS)) {
    return 'savona';
  }

  if (matchesAny(stopId, IMPERIA_PATTERNS)) {
    return 'imperia';
  }

  const stop = stops.find((entry) => entry.id === stopId);
  if (!stop) {
    return null;
  }

  const canonical = stop.canonical ?? '';

  if (
    canonical.startsWith('andora')
    || canonical.startsWith('albenga')
    || canonical.startsWith('ortovero')
    || canonical.includes('leca')
  ) {
    return 'savona';
  }

  if (
    canonical.startsWith('imperia')
    || canonical.startsWith('sanremo')
    || canonical.startsWith('ventimiglia')
    || canonical.startsWith('bordighera')
  ) {
    return 'imperia';
  }

  return null;
}
